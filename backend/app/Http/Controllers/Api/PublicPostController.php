<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
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
            'featured' => ['sometimes', 'boolean'],
        ]);
    
        $posts = Post::query()
            ->where('status', 'published')
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now())
            ->when(
                filter_var($validated['featured'] ?? false, FILTER_VALIDATE_BOOLEAN),
                fn ($query) => $query->where('is_featured', true)
            )
            ->with([
                'user:id,name,profile_photo_path',
                'categories:id,name,slug',
                'featuredImage',
            ])
            ->withCount([
                'comments as approved_comments_count' => fn ($query) => $query->where('status', 'approved'),
            ])
            ->when(filled($validated['search'] ?? null), function ($query) use ($validated) {
                $term = trim($validated['search']);
    
                $query->where(function ($builder) use ($term) {
                    $builder->where('title', 'like', "%{$term}%")->orWhere('excerpt', 'like', "%{$term}%");
                });
            })
            ->when(filled($validated['category'] ?? null), function ($query) use ($validated) {
                $query->whereHas('categories', fn ($categoryQuery) => $categoryQuery->where('slug', $validated['category']));
            })
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->paginate(6)
            ->withQueryString();
    
        $latestposts = Post::query()
            ->where('status', 'published')
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now())
            ->with([
                'user:id,name,profile_photo_path',
                'categories:id,name,slug',
                'featuredImage',
            ])
            ->withCount([
                'comments as approved_comments_count' => fn ($query) => $query->where('status', 'approved'),
            ])
            ->when(filled($validated['category'] ?? null), function ($query) use ($validated) {
                $query->whereHas('categories', fn ($categoryQuery) => $categoryQuery->where('slug', $validated['category']));
            })
            ->latest('published_at')
            ->latest('id')
            ->limit(6)
            ->get();
    
        return response()->json([
            'success' => true,
            'data' => [
                'posts' => $posts,
                'latestposts' => $latestposts,
            ],
        ]);
    }

    public function show(string $slug): JsonResponse
    {
        $post = Post::query()
            ->where('slug', $slug)
            ->where('status', 'published')
            ->with([
                'user:id,name,profile_photo_path',
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
            ->paginate(20, ['id', 'post_id', 'author_name', 'body', 'created_at'], 'page');

        return response()->json(['success' => true, 'data' => $comments]);
    }

    public function storeComment(Request $request, string $slug): JsonResponse
    {
        $post = Post::query()
            ->where('slug', $slug)
            ->where('status', 'published')
            ->firstOrFail();

        
        if (! $post->allow_comments) {
            return response()->json([
                'success' => false,
                'message' => 'Komentar untuk artikel ini telah dinonaktifkan.',
            ], 403);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:80'],
            'email' => ['required', 'email:rfc', 'max:254'],
            'body' => ['required', 'string', 'min:3', 'max:3000'],
            // Honeypot field: real users leave it blank.
            'website' => ['nullable', 'prohibited'],
        ]);

        $comment = $post->comments()->create([
            'user_id' => $request->user()?->id,
            'author_name' => trim($validated['name']),
            'author_email' => Str::lower(trim($validated['email'])),
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
    
    public function postsByCategory(): JsonResponse
    {
        $categories = Category::query()
            ->whereHas('posts', function ($query) {
                $query->where('status', 'published')
                    ->whereNotNull('published_at')
                    ->where('published_at', '<=', now());
            })
            ->with(['posts' => function ($query) {
                $query->where('status', 'published')
                    ->whereNotNull('published_at')
                    ->where('published_at', '<=', now())
                    ->with([
                        'user:id,name,profile_photo_path',
                        'categories:id,name,slug',
                        'featuredImage',
                    ])
                    ->withCount([
                        'comments as approved_comments_count' => fn ($comments) => $comments->where('status', 'approved'),
                    ])
                    ->orderByDesc('published_at')
                    ->orderByDesc('id')
                    ->limit(4);
            }])
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'description']);
    
        return response()->json([
            'success' => true,
            'data' => $categories,
        ]);
    }
}
