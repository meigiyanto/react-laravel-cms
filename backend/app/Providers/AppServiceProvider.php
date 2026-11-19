<?php

namespace App\Providers;

use App\Models\Page;
use App\Models\Post;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Post::created(fn (Post $post) => $post->recordContentRevision());
        Post::updated(fn (Post $post) => $post->recordContentRevision());
        Page::created(fn (Page $page) => $page->recordContentRevision());
        Page::updated(fn (Page $page) => $page->recordContentRevision());
    }
}
