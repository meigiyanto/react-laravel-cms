<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LayoutRevision extends Model
{
    protected $fillable = ['layout_id', 'revision_number', 'definition', 'user_id'];

    protected function casts(): array
    {
        return ['definition' => 'array'];
    }

    public function layout(): BelongsTo
    {
        return $this->belongsTo(Layout::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
