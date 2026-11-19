<?php

namespace App\Support;

use App\Models\Media;
use Illuminate\Validation\ValidationException;

class LayoutDefinition
{
    private const SECTION_TYPES = ['container', 'hero', 'content', 'grid', 'columns', 'cta'];
    private const BLOCK_TYPES = ['heading', 'text', 'image', 'button', 'spacer'];
    private const SECTION_SETTINGS = ['width', 'spacing', 'background'];
    private const BLOCK_SETTINGS = ['align', 'size', 'variant', 'url', 'target'];

    public static function validate(mixed $definition): array
    {
        if (! is_array($definition) || ! self::hasOnlyKeys($definition, ['version', 'sections']) || ! array_key_exists('version', $definition) || ! array_key_exists('sections', $definition)
            || ($definition['version'] ?? null) !== 1 || ! is_array($definition['sections']) || count($definition['sections']) > 50) {
            self::fail('definition', 'Struktur layout harus memiliki version 1 dan sections (maksimal 50).');
        }
        $sectionIds = [];
        $blockIds = [];
        $blockCount = 0;
        foreach ($definition['sections'] as $index => $section) {
            $path = "definition.sections.{$index}";
            if (! is_array($section) || ! self::hasOnlyKeys($section, ['id', 'type', 'settings', 'blocks'])
                || ! self::validId($section['id'] ?? null) || ! in_array($section['type'] ?? null, self::SECTION_TYPES, true)
                || ! is_array($section['settings'] ?? null) || ! is_array($section['blocks'] ?? null)) {
                self::fail($path, 'Section tidak valid atau menggunakan properti yang tidak didukung.');
            }
            if (isset($sectionIds[$section['id']])) self::fail("{$path}.id", 'ID section harus unik.');
            $sectionIds[$section['id']] = true;
            self::validateSettings($section['settings'], self::SECTION_SETTINGS, "{$path}.settings");
            foreach ($section['blocks'] as $blockIndex => $block) {
                $blockCount++;
                $blockPath = "{$path}.blocks.{$blockIndex}";
                if (! is_array($block) || ! self::hasOnlyKeys($block, ['id', 'type', 'content', 'settings', 'media_id'])
                    || ! self::validId($block['id'] ?? null) || ! in_array($block['type'] ?? null, self::BLOCK_TYPES, true)
                    || ! is_string($block['content'] ?? null) || mb_strlen($block['content']) > 5000 || ! is_array($block['settings'] ?? null)) {
                    self::fail($blockPath, 'Block tidak valid atau menggunakan properti yang tidak didukung.');
                }
                if (isset($blockIds[$block['id']])) self::fail("{$blockPath}.id", 'ID block harus unik.');
                $blockIds[$block['id']] = true;
                self::validateSettings($block['settings'], self::BLOCK_SETTINGS, "{$blockPath}.settings");
                if (array_key_exists('media_id', $block) && $block['media_id'] !== null) {
                    if ($block['type'] !== 'image' || ! is_int($block['media_id']) || ! Media::query()->whereKey($block['media_id'])->where('mime_type', 'like', 'image/%')->exists()) {
                        self::fail("{$blockPath}.media_id", 'Pilih file gambar yang tersedia di Media Library.');
                    }
                }
                if ($block['type'] === 'button' && isset($block['settings']['url']) && ! self::validLink($block['settings']['url'])) {
                    self::fail("{$blockPath}.settings.url", 'URL tombol harus berupa HTTP(S), mailto, tel, atau path internal yang valid.');
                }
                if ($block['type'] !== 'button' && (isset($block['settings']['url']) || isset($block['settings']['target']))) {
                    self::fail("{$blockPath}.settings", 'Pengaturan tautan hanya berlaku untuk block button.');
                }
            }
        }
        if ($blockCount > 200) self::fail('definition.sections', 'Maksimal 200 block dalam satu layout.');
        return $definition;
    }

    private static function validateSettings(array $settings, array $allowed, string $path): void
    {
        if (! self::hasOnlyKeys($settings, $allowed)) self::fail($path, 'Pengaturan memuat properti yang tidak didukung.');
        foreach ($settings as $key => $value) {
            if ($key === 'url') {
                if (! is_string($value) || mb_strlen($value) > 2048) self::fail("{$path}.{$key}", 'URL tidak valid.');
                continue;
            }
            $values = match ($key) {
                'width' => ['default', 'wide', 'full'],
                'spacing' => ['none', 'small', 'medium', 'large'],
                'background' => ['default', 'surface', 'primary', 'secondary', 'accent'],
                'align' => ['left', 'center', 'right'],
                'size' => ['small', 'medium', 'large'],
                'variant' => ['default', 'primary', 'secondary', 'outline'],
                'target' => ['_self', '_blank'],
                default => [],
            };
            if (! is_string($value) || ! in_array($value, $values, true)) self::fail("{$path}.{$key}", 'Nilai pengaturan tidak didukung.');
        }
    }

    private static function validLink(string $value): bool
    {
        if ($value === '') return true;
        if (str_starts_with($value, '/') && ! str_starts_with($value, '//')) return true;
        $scheme = parse_url($value, PHP_URL_SCHEME);
        return is_string($scheme) && in_array(strtolower($scheme), ['http', 'https', 'mailto', 'tel'], true)
            && filter_var($value, FILTER_VALIDATE_URL) !== false;
    }

    private static function hasOnlyKeys(array $value, array $allowed): bool
    {
        return array_diff(array_keys($value), $allowed) === [];
    }

    private static function validId(mixed $value): bool
    {
        return is_string($value) && preg_match('/^[a-zA-Z0-9_-]{1,80}$/', $value) === 1;
    }

    private static function fail(string $key, string $message): never
    {
        throw ValidationException::withMessages([$key => $message]);
    }
}
