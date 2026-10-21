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
            'search' => ['sometimes', 'nullable', 'string', 'max:255'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);
        
        $query = Media::with('user')->latest();
        
        $search = trim($validated['search'] ?? '');

        if ($search !== '') {
            $query->where(function ($builder) use ($search) {
                $builder->where(
                    'original_name',
                    'like',
                    "%{$search}%"
                )->orWhere(
                    'alt_text',
                    'like',
                    "%{$search}%"
                );
            });
        }
    
        $permissions = $request->user()->role?->permissions ?? [];
    
        if (
            ! in_array('*', $permissions, true)
            && ! in_array('media.view', $permissions, true)
        ) {
            $query->where('user_id', $request->user()->id);
        }
    
        $data = $query->paginate(20)
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

    public function show(Request $request, Media $media): JsonResponse
    {
        $permissions = $request->user()->role?->permissions ?? [];
    
        if (! in_array('*', $permissions, true)
            && ! in_array('media.view', $permissions, true)
            && $media->user_id !== $request->user()->id
        ) {
            abort(403, 'Anda tidak dapat melihat media milik pengguna lain.');
        }
    
        return response()->json([
            'success' => true,
            'data' => $this->formatMedia($media),
        ]);
    }

    public function update(Request $request, Media $media)
    {
        if (! $this->canManageMedia(
            $request,
            $media,
            'media.update',
            'media.update.own'
        )) {
            return response()->json([
                'message' => 'Anda tidak memiliki izin untuk mengubah media ini.',
            ], 403);
        }
    
        $validated = $request->validate([
            'alt_text' => ['nullable', 'string', 'max:255'],
        ]);
    
        $media->update($validated);
    
        return response()->json([
            'data' => $this->formatMedia($media->fresh()),
        ]);
    }
    
    public function destroy(Request $request, Media $media)
    {
        if (! $this->canManageMedia(
            $request,
            $media,
            'media.delete',
            'media.delete.own'
        )) {
            return response()->json([
                'message' => 'Anda tidak memiliki izin untuk menghapus media ini.',
            ], 403);
        }
    
        if ($media->posts()->exists() || $media->pages()->exists()) {
            return response()->json([
                'message' => 'Media sedang digunakan dan tidak dapat dihapus.',
            ], 422);
        }
    
        if ($media->disk && $media->path) {
            \Illuminate\Support\Facades\Storage::disk($media->disk)
                ->delete($media->path);
        }
    
        $media->delete();
    
        return response()->json([
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
    
    private function canManageMedia(
        Request $request,
        Media $media,
        string $globalPermission,
        string $ownPermission
    ): bool {
        $permissions = $request->user()?->role?->permissions ?? [];
    
        if (! is_array($permissions)) {
            return false;
        }
    
        if (in_array('*', $permissions, true) || in_array($globalPermission, $permissions, true)) {
            return true;
        }
    
        return in_array($ownPermission, $permissions, true) && (int) $media->user_id === (int) $request->user()->id;
    }
}
