<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Comment extends Model
{
    public const STATUSES = [
        'pending',
        'approved',
        'rejected',
    ];

    protected $fillable = [
        'post_id',
        'user_id',
        'author_name',
        'author_email',
        'body',
        'status',
    ];

    public function post(): BelongsTo
    {
        return $this->belongsTo(Post::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}