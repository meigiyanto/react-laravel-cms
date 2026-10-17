<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Page;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class PageController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Page::with(['user', 'featuredImage'])
            ->latest();

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();

            $query->where(function ($builder) use ($search) {
                $builder->where('title', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where(
                'status',
                $request->string('status')->toString()
            );
        }

        return response()->json([
            'success' => true,
            'data' => $query->paginate(15),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'unique:pages,slug'],
            'body' => ['required', 'string'],
            'status' => ['sometimes', Rule::in(['draft', 'published', 'archived'])],
            'featured_image_id' => ['nullable', 'integer', 'exists:media,id'],
            'meta_title' => ['nullable', 'string', 'max:255'],
            'meta_description' => ['nullable', 'string', 'max:500'],
        ]);

        $validated['slug'] = $this->uniqueSlug(
            $validated['slug'] ?? $validated['title']
        );

        $validated['user_id'] = $request->user()->id;
        $validated['status'] = $validated['status'] ?? 'draft';
        $validated['published_at'] =
            $validated['status'] === 'published' ? now() : null;

        $page = Page::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Halaman berhasil dibuat.',
            'data' => $page->load(['user', 'featuredImage']),
        ], 201);
    }

    public function show(Page $page): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $page->load(['user', 'featuredImage']),
        ]);
    }

    public function update(Request $request, Page $page): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'slug' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Rule::unique('pages', 'slug')->ignore($page->id),
            ],
            'body' => ['sometimes', 'required', 'string'],
            'status' => ['sometimes', Rule::in(['draft', 'published', 'archived'])],
            'featured_image_id' => ['sometimes', 'nullable', 'integer', 'exists:media,id'],
            'meta_title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'meta_description' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);

        if (array_key_exists('slug', $validated)) {
            $validated['slug'] = $this->uniqueSlug(
                $validated['slug'],
                $page->id
            );
        } elseif (array_key_exists('title', $validated)) {
            $validated['slug'] = $this->uniqueSlug(
                $validated['title'],
                $page->id
            );
        }

        if (isset($validated['status'])) {
            if ($validated['status'] === 'published') {
                $validated['published_at'] =
                    $page->published_at ?? now();
            } else {
                $validated['published_at'] = null;
            }
        }

        $page->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Halaman berhasil diperbarui.',
            'data' => $page->fresh()->load(['user', 'featuredImage']),
        ]);
    }

    public function destroy(Page $page): JsonResponse
    {
        $page->delete();

        return response()->json([
            'success' => true,
            'message' => 'Halaman berhasil dihapus.',
        ]);
    }

    private function uniqueSlug(string $value, ?int $ignoreId = null): string
    {
        $base = Str::slug($value) ?: 'halaman';
        $slug = $base;
        $counter = 2;

        while (
            Page::where('slug', $slug)
                ->when(
                    $ignoreId,
                    fn ($query) => $query->where('id', '!=', $ignoreId)
                )
                ->exists()
        ) {
            $slug = $base . '-' . $counter;
            $counter++;
        }

        return $slug;
    }
}
