<?php

namespace App\\Http\\Controllers\\Api;

use App\\Http\\Controllers\\Controller;
use App\\Models\\Page;
use Illuminate\\Http\\JsonResponse;
use Illuminate\\Support\\Facades\\Storage;

class PublicPageController extends Controller
{
    private const RESERVED_SLUGS = [
        'admin', 'login', 'about', 'about-author', 'contact', 'blog',
    ];

    public function index(): JsonResponse
    {
        $pages = Page::query()
            ->where('status', 'published')
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now())
            ->whereNotIn('slug', self::RESERVED_SLUGS)
            ->orderBy('title')
            ->get(['id', 'title', 'slug']);

        return response()->json([
            'success' => true,
            'data' => $pages,
        ]);
    }

    public function show(string $slug): JsonResponse
    {
        abort_if(in_array($slug, self::RESERVED_SLUGS, true), 404);

        $page = Page::query()
            ->where('slug', $slug)
            ->where('status', 'published')
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now())
            ->with('featuredImage')
            ->firstOrFail();

        $featuredImage = $page->featuredImage;
        $image = $featuredImage ? [
            'id' => $featuredImage->id,
            'path' => $featuredImage->path,
            'url' => Storage::disk($featuredImage->disk)->url($featuredImage->path),
            'alt_text' => $featuredImage->alt_text,
            'original_name' => $featuredImage->original_name,
        ] : null;

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $page->id,
                'title' => $page->title,
                'slug' => $page->slug,
                'body' => $page->body,
                'status' => $page->status,
                'published_at' => $page->published_at,
                'featured_image' => $image,
                'meta_title' => $page->meta_title,
                'meta_description' => $page->meta_description,
            ],
        ]);
    }
}
