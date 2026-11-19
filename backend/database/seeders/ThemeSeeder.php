<?php

namespace Database\Seeders;

use App\Models\Theme;
use App\Models\ThemeActivation;
use App\Services\ThemeManagerService;
use Illuminate\Database\Seeder;

class ThemeSeeder extends Seeder
{
    public function run(): void
    {
        $theme = Theme::firstOrCreate(
            ['slug' => 'contenthub-default'],
            [
                'name' => 'ContentHub Default',
                'description' => 'Tema bawaan ContentHub.',
                'version' => '1.0.0',
                'status' => 'published',
            ]
        );

        $theme->settings()->firstOrCreate(
            ['theme_id' => $theme->id],
            ['schema_version' => 1, 'settings' => app(ThemeManagerService::class)->defaultSettings()]
        );

        if (! $theme->revisions()->exists()) {
            app(ThemeManagerService::class)->recordRevision($theme);
        }
        ThemeActivation::query()->firstOrCreate(
            ['id' => 1],
            ['theme_id' => $theme->id]
        );
    }
}
