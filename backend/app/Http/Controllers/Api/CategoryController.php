<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;

class CategoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);
    
        $query = Category::withCount('posts');
    
        if (!empty($validated['search'])) {
            $search = trim($validated['search']);
    
            $query->where(function ($builder) use ($search) {
                $builder->where('name', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }
    
        return response()->json([
            'success' => true,
            'data' => $query
                ->orderBy('name')
                ->paginate(15),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'slug' => ['nullable', 'string', 'max:180', 'unique:categories,slug'],
            'description' => ['nullable', 'string', 'max:2000'],
        ]);

        $validated['slug'] = $this->uniqueSlug(
            $validated['slug'] ?? $validated['name']
        );

        $category = Category::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Kategori berhasil dibuat.',
            'data' => $category->loadCount('posts'),
        ], 201);
    }

    public function show(Category $category): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $category->loadCount('posts'),
        ]);
    }

    public function update(
        Request $request,
        Category $category
    ): JsonResponse {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:150'],
            'slug' => [
                'sometimes',
                'required',
                'string',
                'max:180',
                Rule::unique('categories', 'slug')->ignore($category->id),
            ],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ]);

        if (array_key_exists('slug', $validated)) {
            $validated['slug'] = $this->uniqueSlug(
                $validated['slug'],
                $category->id
            );
        } elseif (array_key_exists('name', $validated)) {
            $validated['slug'] = $this->uniqueSlug(
                $validated['name'],
                $category->id
            );
        }

        $category->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Kategori berhasil diperbarui.',
            'data' => $category->fresh()->loadCount('posts'),
        ]);
    }

    public function destroy(Category $category): JsonResponse
    {
        if ($category->posts()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Kategori masih digunakan oleh artikel.',
            ], 422);
        }

        $category->delete();

        return response()->json([
            'success' => true,
            'message' => 'Kategori berhasil dihapus.',
        ]);
    }

    private function uniqueSlug(string $value, ?int $ignoreId = null): string
    {
        $base = Str::slug($value);

        if ($base === '') {
            $base = 'kategori';
        }

        $slug = $base;
        $counter = 2;

        while (
            Category::where('slug', $slug)
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
