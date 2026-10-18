<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Media;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class MediaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);
    
        $query = Media::with('user')->latest();
    
        $search = trim($validated['search'] ?? '');
    
        if ($search !== '') {
            $query->where(function ($builder) use ($search) {
                $builder->where('original_name', 'like', "%{$search}%")
                    ->orWhere('alt_text', 'like', "%{$search}%");
            });
        }
    
        $data = $query
            ->paginate(20)
            ->through(fn (Media $media) => $this->formatMedia($media));
    
        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }
    
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'file' => [
                'required',
                'file',
                'image',
                'mimes:jpeg,jpg,png,webp,gif',
                'max:5120',
            ],
            'alt_text' => ['nullable', 'string', 'max:255'],
        ]);

        $file = $validated['file'];
        $path = $file->store('cms-media', 'public');

        if ($path === false) {
            return response()->json([
                'success' => false,
                'message' => 'File gagal disimpan.',
            ], 500);
        }

        try {
            $media = Media::create([
                'user_id' => $request->user()->id,
                'disk' => 'public',
                'path' => $path,
                'original_name' => $file->getClientOriginalName(),
                'mime_type' => $file->getMimeType(),
                'size' => $file->getSize(),
                'alt_text' => $validated['alt_text'] ?? null,
            ]);
        } catch (\Throwable $exception) {
            Storage::disk('public')->delete($path);

            throw $exception;
        }

        return response()->json([
            'success' => true,
            'message' => 'Media berhasil diunggah.',
            'data' => $this->formatMedia($media),
        ], 201);
    }

    public function show(Media $media): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->formatMedia($media),
        ]);
    }

    public function update(Request $request, Media $media): JsonResponse
    {
        $validated = $request->validate([
            'alt_text' => ['sometimes', 'nullable', 'string', 'max:255'],
        ]);

        $media->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Metadata media berhasil diperbarui.',
            'data' => $this->formatMedia($media->fresh()),
        ]);
    }

    public function destroy(Media $media): JsonResponse
    {
        if (
            $media->posts()->exists() ||
            $media->pages()->exists()
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Media masih digunakan oleh artikel atau halaman.',
            ], 422);
        }

        $disk = Storage::disk($media->disk);

        if ($disk->exists($media->path) && ! $disk->delete($media->path)) {
            return response()->json([
                'success' => false,
                'message' => 'File gagal dihapus. Data media tetap dipertahankan.',
            ], 500);
        }

        $media->delete();

        return response()->json([
            'success' => true,
            'message' => 'Media berhasil dihapus.',
        ]);
    }

    private function formatMedia(Media $media): array
    {
        return [
            'id' => $media->id,
            'user_id' => $media->user_id,
            'disk' => $media->disk,
            'path' => $media->path,
            'url' => Storage::disk($media->disk)->url($media->path),
            'original_name' => $media->original_name,
            'mime_type' => $media->mime_type,
            'size' => $media->size,
            'alt_text' => $media->alt_text,
            'created_at' => $media->created_at,
        ];
    }
}
