<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tag;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class TagController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => Tag::query()->orderBy('name')->get(['id', 'name', 'slug']),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'slug' => ['sometimes', 'nullable', 'string', 'max:180', 'unique:tags,slug'],
        ]);

        $tag = Tag::create([
            'name' => trim($validated['name']),
            'slug' => $this->uniqueSlug(($validated['slug'] ?? null) ?: $validated['name']),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Tag berhasil dibuat.',
            'data' => $tag,
        ], 201);
    }

    public function update(Request $request, Tag $tag): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:150'],
            'slug' => ['sometimes', 'nullable', 'string', 'max:180', Rule::unique('tags', 'slug')->ignore($tag->id)],
        ]);

        if (array_key_exists('name', $validated)) {
            $validated['name'] = trim($validated['name']);
        }

        if (array_key_exists('slug', $validated) || array_key_exists('name', $validated)) {
            $validated['slug'] = $this->uniqueSlug(
                ($validated['slug'] ?? null) ?: ($validated['name'] ?? $tag->name),
                $tag->id
            );
        }

        $tag->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Tag berhasil diperbarui.',
            'data' => $tag->fresh(),
        ]);
    }

    public function destroy(Tag $tag): JsonResponse
    {
        if ($tag->posts()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Tag masih digunakan oleh artikel. Lepaskan tag dari artikel terlebih dahulu.',
            ], 422);
        }

        $tag->delete();

        return response()->json([
            'success' => true,
            'message' => 'Tag berhasil dihapus.',
        ]);
    }

    private function uniqueSlug(string $value, ?int $ignoreId = null): string
    {
        $base = Str::slug($value) ?: 'tag';
        $slug = $base;
        $counter = 2;

        while (Tag::query()
            ->where('slug', $slug)
            ->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))
            ->exists()) {
            $slug = $base . '-' . $counter++;
        }

        return $slug;
    }
}
