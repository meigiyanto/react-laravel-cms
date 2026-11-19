<?php

namespace App\Services;

use App\Models\Theme;
use App\Models\ThemeActivation;
use App\Models\ThemeRevision;
use App\Support\ThemeDefaults;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ThemeManagerService
{
    public function validateSettings(array $settings): array
    {
        $allowedKeys = ['colors', 'typography', 'layout', 'radius', 'shadows', 'components'];
        if (array_diff(array_keys($settings), $allowedKeys)) {
            throw ValidationException::withMessages(['settings' => 'Konfigurasi tema berisi properti yang tidak diizinkan.']);
        }

        $rules = [
            'colors' => ['required', 'array:primary,secondary,background,surface,text,heading,accent,contrast,nav,navHover,navBackground,navDropdownBackground,navDropdownText,navDropdownHover'],
            'colors.*' => ['required', 'string', 'regex:/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/'],
            'typography' => ['required', 'array:bodyFont,headingFont,navFont,baseFontSize,headingWeight,bodyWeight,lineHeight'],
            'typography.bodyFont' => ['required', 'string', 'max:120', 'regex:/^[a-zA-Z0-9 ,"\'-]+$/'],
            'typography.headingFont' => ['required', 'string', 'max:120', 'regex:/^[a-zA-Z0-9 ,"\'-]+$/'],
            'typography.navFont' => ['required', 'string', 'max:120', 'regex:/^[a-zA-Z0-9 ,"\'-]+$/'],
            'typography.baseFontSize' => ['required', 'string', 'regex:/^([1-9]|[1-9][0-9])px$/'],
            'typography.headingWeight' => ['required', 'integer', 'between:100,900'],
            'typography.bodyWeight' => ['required', 'integer', 'between:100,900'],
            'typography.lineHeight' => ['required', 'numeric', 'between:1,2.5'],
            'layout' => ['required', 'array:containerWidth,sectionSpacing,breakpoints'],
            'layout.containerWidth' => ['required', 'string', 'regex:/^[1-9][0-9]{2,3}px$/'],
            'layout.sectionSpacing' => ['required', 'string', 'regex:/^[0-9]{1,3}px$/'],
            'layout.breakpoints' => ['required', 'array:sm,md,lg,xl'],
            'layout.breakpoints.*' => ['required', 'integer', 'between:320,1920'],
            'radius' => ['required', 'array:small,medium,large'],
            'radius.*' => ['required', 'string', 'regex:/^[0-9]{1,3}px$/'],
            'shadows' => ['required', 'array:small,medium,large'],
            'shadows.*' => ['required', 'in:none,soft,medium,strong'],
            'components' => ['required', 'array:buttonStyle,cardStyle'],
            'components.buttonStyle' => ['required', 'in:solid,outline,soft'],
            'components.cardStyle' => ['required', 'in:flat,bordered,elevated'],
        ];

        $validator = Validator::make($settings, $rules);
        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        $validated = $validator->validated();
        $breakpoints = $validated['layout']['breakpoints'];
        if (! ($breakpoints['sm'] < $breakpoints['md'] && $breakpoints['md'] < $breakpoints['lg'] && $breakpoints['lg'] < $breakpoints['xl'])) {
            throw ValidationException::withMessages(['layout.breakpoints' => 'Breakpoint harus berurutan dari kecil ke besar.']);
        }

        return $validated;
    }

    public function recordRevision(Theme $theme, ?int $userId = null): ThemeRevision
    {
        $revisionNumber = ((int) $theme->revisions()->max('revision_number')) + 1;

        return $theme->revisions()->create([
            'revision_number' => $revisionNumber,
            'settings' => $theme->settings()->firstOrFail()->settings,
            'user_id' => $userId,
        ]);
    }

    public function restoreRevision(Theme $theme, ThemeRevision $revision, ?int $userId = null): ThemeRevision
    {
        return DB::transaction(function () use ($theme, $revision, $userId) {
            $lockedTheme = Theme::query()->lockForUpdate()->findOrFail($theme->id);
            $sourceRevision = $lockedTheme->revisions()
                ->whereKey($revision->id)
                ->firstOrFail();
            $settings = $this->validateSettings($sourceRevision->settings);

            $lockedTheme->settings()->updateOrCreate(
                ['theme_id' => $lockedTheme->id],
                ['schema_version' => 1, 'settings' => $settings]
            );

            // Restoring is append-only: keep the source snapshot and record the
            // restored configuration as a new revision in the history.
            return $this->recordRevision($lockedTheme, $userId);
        });
    }

    public function activate(Theme $theme, ?int $userId = null): ThemeActivation
    {
        return DB::transaction(function () use ($theme, $userId) {
            Theme::query()->lockForUpdate()->firstOrFail();
            $theme->loadMissing('settings');

            if (! $theme->settings) {
                abort(422, 'Tema belum memiliki konfigurasi.');
            }

            $theme->update(['status' => 'published']);

            return ThemeActivation::query()->updateOrCreate(
                ['id' => 1],
                ['theme_id' => $theme->id, 'activated_by' => $userId]
            );
        });
    }

    public function duplicate(Theme $source, string $name, ?int $userId = null): Theme
    {
        return DB::transaction(function () use ($source, $name, $userId) {
            $source = Theme::query()->with('settings')->lockForUpdate()->findOrFail($source->id);
            abort_unless($source->settings, 422, 'Tema sumber belum memiliki konfigurasi.');

            $baseSlug = Str::slug($name) ?: 'theme-copy';
            $slug = $baseSlug;
            $suffix = 2;
            while (Theme::query()->where('slug', $slug)->exists()) {
                $slug = $baseSlug . '-' . $suffix++;
            }

            $settings = $this->validateSettings($source->settings->settings);
            $copy = Theme::create([
                'name' => $name,
                'slug' => $slug,
                'description' => 'Salinan dari tema ' . $source->name,
                'version' => $source->version,
                'status' => 'draft',
            ]);
            $copy->settings()->create(['schema_version' => $source->settings->schema_version, 'settings' => $settings]);
            $this->recordRevision($copy, $userId);

            return $copy->load('settings')->loadCount('revisions');
        });
    }

    public function defaultSettings(): array
    {
        return ThemeDefaults::settings();
    }
}
