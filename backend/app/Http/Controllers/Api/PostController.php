<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Post;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use App\Support\ArticleHtmlSanitizer;

class PostController extends Controller
{
    private const STATUSES = ['draft', 'published', 'archived'];

    public function stats(Request $request): JsonResponse
    {
        $user = $request->user();
        $permissions = $user->role?->permissions ?? [];
    
        $canViewAll = in_array('*', $permissions, true)
            || in_array('posts.view', $permissions, true);
    
        $query = Post::query();
    
        if (! $canViewAll) {
            // Role dengan posts.view.own hanya menghitung artikelnya sendiri.
            $query->where('user_id', $user->id);
        }
    
        return response()->json([
            'success' => true,
            'data' => [
                'total' => (clone $query)->count(),
                'published' => (clone $query)
                    ->where('status', 'published')
                    ->count(),
                'draft' => (clone $query)
                    ->where('status', 'draft')
                    ->count(),
                'archived' => (clone $query)
                    ->where('status', 'archived')
                    ->count(),
            ],
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['sometimes', 'nullable', 'string', 'max:255'],
            'status' => ['sometimes', 'nullable', Rule::in(self::STATUSES)],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

        $posts = Post::query()
            ->with(['user.role', 'categories', 'tags', 'featuredImage'])
            ->when(
                filled($validated['search'] ?? null),
                function ($query) use ($validated) {
                    $search = trim($validated['search']);
                    $query->where(function ($builder) use ($search) {
                        $builder->where('title', 'like', "%{$search}%")
                        ->orWhere('slug', 'like', "%{$search}%");
                    });
                }
            )
            ->when(
                filled($validated['status'] ?? null),
                fn ($query) => $query->where('status', $validated['status'])
            )
            ->when(
                ! in_array(
                    '*',
                    $request->user()->role?->permissions ?? [],
                    true
                ) && ! in_array(
                    'posts.view',
                    $request->user()->role?->permissions ?? [],
                    true
                ),
                fn ($query) => $query->where(
                    'user_id',
                    $request->user()->id
                )
            )
            ->latest()
            ->paginate(10)
            ->withQueryString();

        return response()->json([
            'success' => true,
            'data' => $posts,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->merge([
            'slug' => trim((string) $request->input('slug')) ?: Str::slug((string) $request->input('title')),
        ]);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', 'unique:posts,slug'],
            'excerpt' => ['nullable', 'string', 'max:5000'],
            'body' => ['required', 'string'],
            'status' => ['required', Rule::in(self::STATUSES)],
            'category_ids' => ['sometimes', 'array'],
            'category_ids.*' => ['required', 'integer', 'distinct', 'exists:categories,id'],
            'tag_ids' => ['sometimes', 'array'],
            'tag_ids.*' => ['required', 'integer', 'distinct', 'exists:tags,id'],
            'is_featured' => ['sometimes', 'boolean'],
            'allow_comments' => ['sometimes', 'boolean'],
            'featured_image_id' => ['sometimes', 'nullable', 'integer', 'exists:media,id'],
            'meta_title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'meta_description' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);

        $validated['body'] = ArticleHtmlSanitizer::sanitize($validated['body']);

        $permissions = $request->user()->role?->permissions ?? [];
        
        if (
            ! in_array('*', $permissions, true)
            && ! in_array('posts.publish', $permissions, true)
            && ($validated['status'] ?? 'draft') !== 'draft'
        ) {
            abort(403, 'Artikel harus tetap berstatus draft.');
        }

        $post = DB::transaction(function () use ($request, $validated) {
            $post = Post::create([
                'user_id' => $request->user()->id,
                'title' => trim($validated['title']),
                'slug' => $validated['slug'],
                'excerpt' => $this->nullableTrim($validated['excerpt'] ?? null),
                'body' => $validated['body'],
                'status' => $validated['status'],
                'published_at' => $validated['status'] === 'published' ? now() : null,
                'is_featured' => $validated['is_featured'] ?? false,
                'allow_comments' => $validated['allow_comments'] ?? true,
                'featured_image_id' => $validated['featured_image_id'] ?? null,
                'meta_title' => $this->nullableTrim($validated['meta_title'] ?? null),
                'meta_description' => $this->nullableTrim($validated['meta_description'] ?? null),
            ]);
            
            $post->categories()->sync($validated['category_ids'] ?? []);
            $post->tags()->sync($validated['tag_ids'] ?? []);

            return $post;
        });
        
        return response()->json([
            'success' => true,
            'message' => 'Artikel berhasil dibuat.',
            'data' => $post->load(['user.role', 'categories', 'tags', 'featuredImage']),
        ], 201);
    }

    public function show(Request $request, Post $post): JsonResponse    
    {
        $permissions = $request->user()->role?->permissions ?? [];

        if (! in_array('*', $permissions, true)
            && ! in_array('posts.view', $permissions, true)
            && $post->user_id !== $request->user()->id
        ) {
            abort(403, 'Anda tidak dapat melihat artikel milik pengguna lain.');
        }
        
        return response()->json([
            'success' => true,
            'data' => $post->load(['user.role', 'categories', 'tags', 'featuredImage']),
        ]);
    }

    public function update(Request $request, Post $post): JsonResponse
    {
        if ($request->exists('slug') || $request->exists('title')) {
            $request->merge([
                'slug' => trim((string) $request->input('slug')) ?: Str::slug((string) $request->input('title'))
            ]);
        }
        
        $permissions = $request->user()->role?->permissions ?? [];
        
        if (! in_array('*', $permissions, true)
            && ! in_array('posts.update', $permissions, true)
            && $post->user_id !== $request->user()->id
        ) {
            abort(403, 'Anda tidak dapat melihat artikel milik pengguna lain.');
        }
        
        $validated = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'slug' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('posts', 'slug')->ignore($post->id)],
            'excerpt' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'body' => ['sometimes', 'required', 'string'],
            'status' => ['sometimes', 'required', Rule::in(self::STATUSES)],
            'category_ids' => ['sometimes', 'array'],
            'category_ids.*' => ['required', 'integer', 'distinct', 'exists:categories,id'],
            'tag_ids' => ['sometimes', 'array'],
            'tag_ids.*' => ['required', 'integer', 'distinct', 'exists:tags,id'],
            'is_featured' => ['sometimes', 'boolean'],
            'allow_comments' => ['sometimes', 'boolean'],
            'featured_image_id' => ['sometimes', 'nullable', 'integer', 'exists:media,id'],
            'meta_title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'meta_description' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);

        if (isset($validated['status'])
            && ! in_array('*', $permissions, true)
            && ! in_array('posts.publish', $permissions, true)
            && $validated['status'] !== 'draft'
        ) {
            abort(403, 'Anda tidak memiliki izin untuk mengubah status publikasi.');
        }

        if (array_key_exists('body', $validated)) {
            $validated['body'] = ArticleHtmlSanitizer::sanitize(
                $validated['body']
            );
        }

        DB::transaction(function () use ($validated, $post) {
            $wasPublished = $post->status === 'published';
            $nextStatus = $validated['status'] ?? $post->status;

            $attributes = [];
            foreach (['title', 'slug', 'body', 'status'] as $field) {
                if (array_key_exists($field, $validated)) {
                    $attributes[$field] = $field === 'title' ? trim($validated[$field]) : $validated[$field];
                }
            }

            foreach (['excerpt', 'meta_title', 'meta_description'] as $field) {
                if (array_key_exists($field, $validated)) {
                    $attributes[$field] = $this->nullableTrim($validated[$field]);
                }
            }

            if (array_key_exists('featured_image_id', $validated)) {
                $attributes['featured_image_id'] = $validated['featured_image_id'];
            }
            
            foreach (['is_featured', 'allow_comments'] as $field) {
                if (array_key_exists($field, $validated)) {
                    $attributes[$field] = $validated[$field];
                }
            }

            if (array_key_exists('status', $validated)) {
                $attributes['published_at'] = $nextStatus === 'published' ? ($wasPublished ? $post->published_at : now()) : null;
            }

            if ($attributes !== []) {
                $post->fill($attributes)->save();
            }
            
            // Omitted relation keys mean "leave unchanged"; [] means "clear all".
            if (array_key_exists('category_ids', $validated)) {
                $post->categories()->sync($validated['category_ids']);
            }

            if (array_key_exists('tag_ids', $validated)) {
                $post->tags()->sync($validated['tag_ids']);
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Artikel berhasil diperbarui.',
            'data' => $post->load(['user.role', 'categories', 'tags', 'featuredImage']),
        ]);
    }
    
    public function destroy(Request $request, Post $post): JsonResponse
    {
        $permissions = $request->user()->role?->permissions ?? [];
    
        $canDeleteAll = in_array('*', $permissions, true) || in_array('posts.delete', $permissions, true);
    
        $canDeleteOwn = in_array('posts.delete.own', $permissions, true);

        if (! $canDeleteAll && (! $canDeleteOwn || $post->user_id !== $request->user()->id)
        ) {
            abort(403, 'Anda tidak memiliki izin untuk menghapus artikel ini.');
        }
    
        $post->delete();
    
        return response()->json([
            'success' => true,
            'message' => 'Artikel berhasil dihapus.',
        ]);
    }

    private function nullableTrim(?string $value): ?string
    {
        $value = trim((string) $value);

        return $value === '' ? null : $value;
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
