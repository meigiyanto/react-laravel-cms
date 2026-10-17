<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Post;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;

class PostController extends Controller
{
    public function stats()
    {
        return response()->json([
            'success' => true,
            'data' => [
                'total' => Post::count(),
                'published' => Post::where('status', 'published')->count(),
                'draft' => Post::where('status', 'draft')->count(),
                'archived' => Post::where('status', 'archived')->count(),
            ],
        ]);
    }

    public function index(Request $request)
    {
        $posts = Post::query()
            ->with(['user', 'categories'])
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = $request->string('search')->toString();
                $query->where(function ($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                      ->orWhere('slug', 'like', "%{$search}%");
                });
            })
            ->when($request->filled('status'), fn ($q) =>
                $q->where('status', $request->input('status'))
            )
            ->latest()
            ->paginate(10)
            ->withQueryString();

        return response()->json([
            'success' => true,
            'data' => $posts,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'unique:posts,slug'],
            'excerpt' => ['nullable', 'string'],
            'body' => ['required', 'string'],
            'status' => ['required', Rule::in(['draft', 'published', 'archived'])],
            'category_ids' => ['sometimes', 'array'],
            'category_ids.*' => ['integer', 'distinct', 'exists:categories,id'],
        ]);

        return DB::transaction(function () use ($validated) {
            $post = Post::create([
                'title' => $validated['title'],
                'slug' => $validated['slug'] ?: Str::slug($validated['title']),
                'excerpt' => $validated['excerpt'] ?? null,
                'body' => $validated['body'],
                'status' => $validated['status'],
                'published_at' => $validated['status'] === 'published' ? now() : null,
            ]);

            $post->categories()->sync($validated['category_ids'] ?? []);

            return response()->json([
                'success' => true,
                'message' => 'Artikel berhasil dibuat.',
                'data' => $post->load('categories'),
            ], 201);
        });
    }

    public function show(Post $post)
    {
        return response()->json([
            'success' => true,
            'data' => $post->load(['user', 'categories', 'tags', 'featuredImage']),
        ]);
    }

    public function update(Request $request, Post $post)
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', Rule::unique('posts', 'slug')->ignore($post->id)],
            'excerpt' => ['nullable', 'string'],
            'body' => ['required', 'string'],
            'status' => ['required', Rule::in(['draft', 'published', 'archived'])],
            'category_ids' => ['sometimes', 'array'],
            'category_ids.*' => ['integer', 'distinct', 'exists:categories,id'],
        ]);

        return DB::transaction(function () use ($validated, $post) {
            $wasPublished = $post->status === 'published';

            $post->fill([
                'title' => $validated['title'],
                'slug' => $validated['slug'] ?: Str::slug($validated['title']),
                'excerpt' => $validated['excerpt'] ?? null,
                'body' => $validated['body'],
                'status' => $validated['status'],
                'published_at' => $validated['status'] === 'published'
                    ? ($wasPublished ? $post->published_at : now())
                    : null,
            ])->save();

            if (array_key_exists('category_ids', $validated)) {
                $post->categories()->sync($validated['category_ids']);
            }

            return response()->json([
                'success' => true,
                'message' => 'Artikel berhasil diperbarui.',
                'data' => $post->load('categories'),
            ]);
        });
    }

    public function destroy(Post $post)
    {
        $post->delete();

        return response()->json([
            'success' => true,
            'message' => 'Artikel berhasil dihapus.',
        ]);
    }
}
