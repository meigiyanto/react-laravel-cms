<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Comment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CommentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', Rule::in(Comment::STATUSES)],
            'post_id' => ['nullable', 'integer', 'exists:posts,id'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

        $query = Comment::query()
            ->with([
                'post:id,title,slug',
                'user:id,name,email',
            ]);

        if (! empty($validated['search'])) {
            $search = trim($validated['search']);

            $query->where(function ($builder) use ($search) {
                $builder
                    ->where('author_name', 'like', "%{$search}%")
                    ->orWhere('author_email', 'like', "%{$search}%")
                    ->orWhere('body', 'like', "%{$search}%")
                    ->orWhereHas('post', function ($postQuery) use ($search) {
                        $postQuery->where('title', 'like', "%{$search}%");
                    });
            });
        }

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        if (! empty($validated['post_id'])) {
            $query->where('post_id', $validated['post_id']);
        }

        return response()->json([
            'success' => true,
            'data' => $query
                ->latest()
                ->paginate(10)
                ->withQueryString(),
        ]);
    }

    public function updateStatus(
        Request $request,
        Comment $comment
    ): JsonResponse {
        $validated = $request->validate([
            'status' => [
                'required',
                'string',
                Rule::in(Comment::STATUSES),
            ],
        ]);

        $comment->update([
            'status' => $validated['status'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Status komentar berhasil diperbarui.',
            'data' => $comment->fresh()->load([
                'post:id,title,slug',
                'user:id,name,email',
            ]),
        ]);
    }

    public function destroy(Comment $comment): JsonResponse
    {
        $comment->delete();

        return response()->json([
            'success' => true,
            'message' => 'Komentar berhasil dihapus.',
        ]);
    }
}