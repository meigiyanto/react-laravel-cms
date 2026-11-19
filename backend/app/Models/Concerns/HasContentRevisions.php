<?php

namespace App\Models\Concerns;

use App\Models\ContentRevision;
use Illuminate\Support\Facades\Auth;

trait HasContentRevisions
{
    protected static function bootHasContentRevisions(): void
    {
        static::saved(function ($model): void {
            if (! $model->wasChanged()) {
                return;
            }

            $fields = [
                'title', 'slug', 'excerpt', 'body', 'status', 'published_at',
                'featured_image_id', 'meta_title', 'meta_description',
                'is_featured', 'allow_comments',
            ];
            $snapshot = collect($fields)
                ->filter(fn (string $field) => in_array($field, $model->getFillable(), true))
                ->mapWithKeys(fn (string $field) => [$field => $model->getAttribute($field)])
                ->all();

            $nextNumber = (int) ContentRevision::query()
                ->where('revisionable_type', $model->getMorphClass())
                ->where('revisionable_id', $model->getKey())
                ->max('revision_number') + 1;

            ContentRevision::create([
                'revisionable_type' => $model->getMorphClass(),
                'revisionable_id' => $model->getKey(),
                'revision_number' => $nextNumber,
                'user_id' => Auth::id() ?? $model->getAttribute('user_id'),
                'snapshot' => $snapshot,
            ]);
        });
    }

    public function revisions()
    {
        return $this->morphMany(ContentRevision::class, 'revisionable')->latest('revision_number');
    }
}
