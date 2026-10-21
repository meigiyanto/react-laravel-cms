<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Comment;
use App\Models\Post;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PublicPostController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['sometimes', 'nullable', 'string', 'max:120'],
            'category' => ['sometimes', 'nullable', 'string', 'max:120'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

        $posts = Post::query()
            ->where('status', 'published')
            ->with([
                'user:id,name',
                'categories:id,name,slug',
                'featuredImage',
            ])
            ->withCount(['comments as approved_comments_count' => fn ($query) => $query->where('status', 'approved')])
            ->when(filled($validated['search'] ?? null), function ($query) use ($validated) {
                $term = trim($validated['search']);
                $query->where(function ($builder) use ($term) {
                    $builder->where('title', 'like', "%{$term}%")
                        ->orWhere('excerpt', 'like', "%{$term}%");
                });
            })
            ->when(filled($validated['category'] ?? null), function ($query) use ($validated) {
                $query->whereHas('categories', fn ($categoryQuery) =>
                    $categoryQuery->where('slug', $validated['category'])
                );
            })
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->paginate(9)
            ->withQueryString();

        return response()->json(['success' => true, 'data' => $posts]);
    }

    public function show(string $slug): JsonResponse
    {
        $post = Post::query()
            ->where('slug', $slug)
            ->where('status', 'published')
            ->with([
                'user:id,name',
                'categories:id,name,slug',
                'tags:id,name,slug',
                'featuredImage',
            ])
            ->withCount(['comments as approved_comments_count' => fn ($query) => $query->where('status', 'approved')])
            ->firstOrFail();

        return response()->json(['success' => true, 'data' => $post]);
    }

    public function comments(string $slug): JsonResponse
    {
        $post = Post::query()
            ->where('slug', $slug)
            ->where('status', 'published')
            ->firstOrFail();

        $comments = $post->comments()
            ->where('status', 'approved')
            ->latest()
            ->paginate(20, ['id', 'post_id', 'name', 'body', 'created_at'], 'page');

        return response()->json(['success' => true, 'data' => $comments]);
    }

    public function storeComment(Request $request, string $slug): JsonResponse
    {
        $post = Post::query()
            ->where('slug', $slug)
            ->where('status', 'published')
            ->firstOrFail();

        $validated = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:80'],
            'email' => ['required', 'email:rfc', 'max:254'],
            'body' => ['required', 'string', 'min:3', 'max:3000'],
            // Honeypot field: real users leave it blank.
            'website' => ['nullable', 'prohibited'],
        ]);

        $comment = $post->comments()->create([
            'user_id' => $request->user()?->id,
            'name' => trim($validated['name']),
            'email' => Str::lower(trim($validated['email'])),
            'body' => trim($validated['body']),
            'status' => 'pending',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Komentar diterima dan menunggu moderasi admin.',
            'data' => ['id' => $comment->id, 'status' => $comment->status],
        ], 201);
    }

    public function moderateIndex(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['sometimes', 'in:pending,approved,rejected'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

        $comments = Comment::query()
            ->with(['post:id,title,slug', 'user:id,name'])
            ->when(isset($validated['status']), fn ($query) => $query->where('status', $validated['status']))
            ->latest()
            ->paginate(20);

        return response()->json(['success' => true, 'data' => $comments]);
    }

    public function moderateUpdate(Request $request, Comment $comment): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'in:approved,rejected,pending'],
        ]);

        $comment->update(['status' => $validated['status']]);

        return response()->json([
            'success' => true,
            'message' => 'Status komentar berhasil diperbarui.',
            'data' => $comment->only(['id', 'post_id', 'status']),
        ]);
    }
}
