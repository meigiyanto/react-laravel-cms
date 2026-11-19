<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Layout extends Model
{
    protected $fillable = ['name', 'slug', 'description', 'status', 'schema_version', 'definition', 'user_id'];

    protected function casts(): array
    {
        return ['definition' => 'array'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function revisions(): HasMany
    {
        return $this->hasMany(LayoutRevision::class)->orderByDesc('revision_number');
    }
}
