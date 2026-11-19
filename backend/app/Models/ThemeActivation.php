<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ThemeActivation extends Model
{
    protected $table = 'theme_activations';
    public $incrementing = false;
    protected $fillable = ['id', 'theme_id', 'activated_by'];

    public function theme(): BelongsTo
    {
        return $this->belongsTo(Theme::class);
    }

    public function activator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'activated_by');
    }
}
