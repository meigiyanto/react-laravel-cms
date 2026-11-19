<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContentRevision;
use App\Models\Page;
use App\Models\Post;
use App\Support\ArticleHtmlSanitizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ContentRevisionController extends Controller
{
    public function postIndex(Request $request, Post $post): JsonResponse
    {
        $this->authorizePostAccess($request, $post);

        return $this->history($post);
    }

    public function pageIndex(Page $page): JsonResponse
    {
        return $this->history($page);
    }

    public function restorePost(Request $request, Post $post, ContentRevision $revision): JsonResponse
    {
        $this->authorizePostUpdateAccess($request, $post);
        $this->assertRevisionBelongsTo($revision, $post);

        return $this->restore($request, $post, $revision);
    }

    public function restorePage(Request $request, Page $page, ContentRevision $revision): JsonResponse
    {
        $this->assertRevisionBelongsTo($revision, $page);

        return $this->restore($request, $page, $revision);
    }

    private function history(Post|Page $content): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $content->revisions()->with('user:id,name')->get(),
        ]);
    }

    private function restore(Request $request, Post|Page $content, ContentRevision $revision): JsonResponse
    {
        $snapshot = $revision->snapshot;
        $allowed = array_intersect_key($snapshot, array_flip($content->getFillable()));
        unset($allowed['user_id']);

        if (($allowed['status'] ?? $content->status) === 'published' && $content->status !== 'published') {
            $permission = $content instanceof Post ? 'posts.publish' : 'pages.publish';
            $permissions = $request->user()->role?->permissions ?? [];
            abort_unless(
                in_array('*', $permissions, true) || in_array($permission, $permissions, true),
                403,
                'Anda tidak memiliki izin untuk menerbitkan konten melalui pemulihan versi.'
            );
        }

        if (array_key_exists('body', $allowed)) {
            $allowed['body'] = ArticleHtmlSanitizer::sanitize((string) $allowed['body']);
        }

        DB::transaction(function () use ($content, $allowed): void {
            $content->fill($allowed);
            $content->save();
        });

        return response()->json([
            'success' => true,
            'message' => 'Versi konten berhasil dipulihkan. Versi sebelum pemulihan tetap tersimpan dalam riwayat.',
            'data' => $content->fresh()->load(['user', 'featuredImage']),
        ]);
    }

    private function assertRevisionBelongsTo(ContentRevision $revision, Post|Page $content): void
    {
        abort_unless(
            $revision->revisionable_type === $content->getMorphClass()
                && (int) $revision->revisionable_id === (int) $content->getKey(),
            404
        );
    }

    private function authorizePostUpdateAccess(Request $request, Post $post): void
    {
        $permissions = $request->user()->role?->permissions ?? [];
        abort_unless(
            in_array('*', $permissions, true)
                || in_array('posts.update', $permissions, true)
                || ($post->user_id === $request->user()->id && in_array('posts.update.own', $permissions, true)),
            403,
            'Anda tidak dapat memulihkan artikel milik pengguna lain.'
        );
    }

    private function authorizePostAccess(Request $request, Post $post): void
    {
        $permissions = $request->user()->role?->permissions ?? [];
        abort_unless(
            in_array('*', $permissions, true)
                || in_array('posts.view', $permissions, true)
                || ($post->user_id === $request->user()->id && in_array('posts.view.own', $permissions, true)),
            403,
            'Anda tidak dapat melihat riwayat artikel milik pengguna lain.'
        );
    }
}
