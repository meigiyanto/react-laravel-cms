<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Theme extends Model
{
    protected $fillable = ['name', 'slug', 'description', 'version', 'status'];

    public function settings(): HasOne
    {
        return $this->hasOne(ThemeSetting::class);
    }

    public function revisions(): HasMany
    {
        return $this->hasMany(ThemeRevision::class)->orderByDesc('revision_number');
    }
}
