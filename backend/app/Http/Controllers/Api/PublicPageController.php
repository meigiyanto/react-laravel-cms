<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Media;
use App\Models\Page;
use App\Support\LayoutDefinition;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

class PublicPageController extends Controller
{
    private const RESERVED_SLUGS = ['admin', 'login', 'about', 'about-author', 'contact', 'blog', '404', 'search-results'];

    public function index(): JsonResponse
    {
        $pages = Page::query()->where('status', 'published')->whereNotNull('published_at')
            ->where('published_at', '<=', now())->whereNotIn('slug', self::RESERVED_SLUGS)
            ->orderBy('title')->get(['id', 'title', 'slug']);
        return response()->json(['success' => true, 'data' => $pages]);
    }

    public function show(string $slug): JsonResponse
    {
        abort_if(in_array($slug, self::RESERVED_SLUGS, true), 404);
        $page = Page::query()->where('slug', $slug)->where('status', 'published')
            ->whereNotNull('published_at')->where('published_at', '<=', now())
            ->with(['featuredImage', 'layout'])->firstOrFail();
        $featuredImage = $page->featuredImage;
        $layout = null;
        if ($page->layout && $page->layout->status === 'published') {
            $definition = LayoutDefinition::validate($page->layout->definition);
            $mediaIds = [];
            foreach ($definition['sections'] as $section) {
                foreach ($section['blocks'] as $block) {
                    if ($block['type'] === 'image' && ! empty($block['media_id'])) $mediaIds[] = $block['media_id'];
                }
            }
            $media = Media::query()->whereIn('id', array_unique($mediaIds))->get()->keyBy('id');
            foreach ($definition['sections'] as &$section) {
                foreach ($section['blocks'] as &$block) {
                    if ($block['type'] !== 'image' || empty($block['media_id'])) continue;
                    $asset = $media->get($block['media_id']);
                    $block['media'] = $asset ? [
                        'url' => Storage::disk($asset->disk)->url($asset->path),
                        'alt_text' => $asset->alt_text ?: $asset->original_name,
                    ] : null;
                }
                unset($block);
            }
            unset($section);
            $layout = ['id' => $page->layout->id, 'name' => $page->layout->name, 'definition' => $definition];
        }
        $image = $featuredImage ? [
            'id' => $featuredImage->id,
            'path' => $featuredImage->path,
            'url' => Storage::disk($featuredImage->disk)->url($featuredImage->path),
            'alt_text' => $featuredImage->alt_text,
            'original_name' => $featuredImage->original_name,
        ] : null;
        return response()->json(['success' => true, 'data' => [
            'id' => $page->id, 'title' => $page->title, 'slug' => $page->slug, 'body' => $page->body,
            'status' => $page->status, 'published_at' => $page->published_at, 'featured_image' => $image,
            'layout' => $layout, 'meta_title' => $page->meta_title, 'meta_description' => $page->meta_description,
        ]]);
    }
}