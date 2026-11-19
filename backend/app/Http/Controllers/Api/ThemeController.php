<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Theme;
use App\Services\ThemeManagerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ThemeController extends Controller
{
    public function __construct(private readonly ThemeManagerService $themes)
    {
    }

    public function index(): JsonResponse
    {
        $activeThemeId = DB::table('theme_activations')->where('id', 1)->value('theme_id');
        $themes = Theme::query()
            ->with('settings')
            ->withCount('revisions')
            ->orderByDesc('updated_at')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $themes,
            'meta' => ['active_theme_id' => $activeThemeId],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'slug' => ['required', 'string', 'max:120', 'alpha_dash', 'unique:themes,slug'],
            'description' => ['nullable', 'string', 'max:1000'],
            'settings' => ['sometimes', 'array'],
        ]);
        $settings = $this->themes->validateSettings(
            $validated['settings'] ?? $this->themes->defaultSettings()
        );

        $theme = DB::transaction(function () use ($validated, $settings, $request) {
            $theme = Theme::create([
                'name' => $validated['name'],
                'slug' => $validated['slug'],
                'description' => $validated['description'] ?? null,
                'status' => 'draft',
            ]);
            $theme->settings()->create(['schema_version' => 1, 'settings' => $settings]);
            $this->themes->recordRevision($theme, $request->user()->id);

            return $theme->load('settings');
        });

        return response()->json([
            'success' => true,
            'message' => 'Tema berhasil dibuat.',
            'data' => $theme,
        ], 201);
    }

    public function show(Theme $theme): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $theme->load(['settings', 'revisions.user']),
        ]);
    }

    public function update(Request $request, Theme $theme): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'slug' => ['sometimes', 'required', 'string', 'max:120', 'alpha_dash', Rule::unique('themes', 'slug')->ignore($theme->id)],
            'description' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'settings' => ['sometimes', 'required', 'array'],
        ]);

        if (array_key_exists('settings', $validated)) {
            $validated['settings'] = $this->themes->validateSettings($validated['settings']);
        }

        $theme = DB::transaction(function () use ($validated, $theme, $request) {
            $settings = $validated['settings'] ?? null;
            unset($validated['settings']);
            $theme->update($validated);

            if ($settings !== null) {
                $theme->settings()->updateOrCreate(
                    ['theme_id' => $theme->id],
                    ['schema_version' => 1, 'settings' => $settings]
                );
                $this->themes->recordRevision($theme, $request->user()->id);
            }

            return $theme->fresh()->load('settings');
        });

        return response()->json([
            'success' => true,
            'message' => 'Tema berhasil diperbarui.',
            'data' => $theme,
        ]);
    }

    public function activate(Request $request, Theme $theme): JsonResponse
    {
        $activation = $this->themes->activate($theme, $request->user()->id);

        return response()->json([
            'success' => true,
            'message' => 'Tema berhasil diaktifkan.',
            'data' => [
                'theme_id' => $activation->theme_id,
                'activated_at' => $activation->updated_at,
            ],
        ]);
    }
}
