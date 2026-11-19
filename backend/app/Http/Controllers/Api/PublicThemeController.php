<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ThemeActivation;
use Illuminate\Http\JsonResponse;

class PublicThemeController extends Controller
{
    public function active(): JsonResponse
    {
        $activation = ThemeActivation::query()->with('theme.settings')->find(1);
        if (! $activation?->theme || ! $activation->theme->settings) {
            return response()->json([
                'success' => true,
                'data' => null,
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'theme' => [
                    'id' => $activation->theme->id,
                    'name' => $activation->theme->name,
                    'slug' => $activation->theme->slug,
                    'version' => $activation->theme->version,
                ],
                'schema_version' => $activation->theme->settings->schema_version,
                'settings' => $activation->theme->settings->settings,
                'updated_at' => $activation->theme->settings->updated_at,
            ],
        ]);
    }
}
