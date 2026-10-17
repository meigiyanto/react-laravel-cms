<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Media extends Model
{
    protected $fillable = [
        'user_id', 'disk', 'path', 'original_name',
        'mime_type', 'size', 'alt_text',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function posts(): HasMany
    {
        return $this->hasMany(Post::class, 'featured_image_id');
    }

    public function pages(): HasMany
    {
        return $this->hasMany(Page::class, 'featured_image_id');
    }
}