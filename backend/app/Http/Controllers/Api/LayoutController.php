<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Layout;
use App\Support\LayoutDefinition;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class LayoutController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['success' => true, 'data' => Layout::query()
            ->with('user:id,name')->withCount('revisions')->latest()->paginate(15)]);
    }

    public function show(Layout $layout): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $layout->load('user:id,name')->loadCount('revisions')]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'slug' => ['nullable', 'string', 'max:140', 'alpha_dash', 'unique:layouts,slug'],
            'description' => ['nullable', 'string', 'max:2000'],
            'status' => ['sometimes', Rule::in(['draft', 'published', 'archived'])],
            'definition' => ['required', 'array'],
        ]);
        $definition = LayoutDefinition::validate($validated['definition']);
        $layout = DB::transaction(function () use ($request, $validated, $definition) {
            $layout = Layout::create([
                'name' => trim($validated['name']),
                'slug' => $this->uniqueSlug($validated['slug'] ?? $validated['name']),
                'description' => $validated['description'] ?? null,
                'definition' => $definition,
                'schema_version' => 1,
                'status' => $validated['status'] ?? 'draft',
                'user_id' => $request->user()->id,
            ]);
            $this->recordRevision($layout, $request->user()->id);
            return $layout->load('user:id,name')->loadCount('revisions');
        });

        return response()->json(['success' => true, 'message' => 'Layout berhasil dibuat.', 'data' => $layout], 201);
    }

    public function update(Request $request, Layout $layout): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'slug' => ['sometimes', 'required', 'string', 'max:140', 'alpha_dash', Rule::unique('layouts', 'slug')->ignore($layout->id)],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'status' => ['sometimes', Rule::in(['draft', 'published', 'archived'])],
            'definition' => ['sometimes', 'required', 'array'],
        ]);
        if (array_key_exists('definition', $validated)) $validated['definition'] = LayoutDefinition::validate($validated['definition']);

        DB::transaction(function () use ($request, $layout, $validated) {
            $layout->update($validated);
            if (array_key_exists('definition', $validated)) $this->recordRevision($layout->fresh(), $request->user()->id);
        });

        return response()->json(['success' => true, 'message' => 'Layout berhasil diperbarui.', 'data' => $layout->fresh()->load('user:id,name')->loadCount('revisions')]);
    }

    public function destroy(Layout $layout): JsonResponse
    {
        $layout->delete();
        return response()->json(['success' => true, 'message' => 'Layout berhasil dihapus.']);
    }

    public function revisions(Layout $layout): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $layout->revisions()->with('user:id,name')->paginate(20)]);
    }

    private function recordRevision(Layout $layout, ?int $userId): void
    {
        $number = ((int) $layout->revisions()->max('revision_number')) + 1;
        $layout->revisions()->create(['revision_number' => $number, 'definition' => $layout->definition, 'user_id' => $userId]);
    }

    private function uniqueSlug(string $value): string
    {
        $base = Str::slug($value) ?: 'layout';
        $slug = $base;
        $number = 2;
        while (Layout::where('slug', $slug)->exists()) $slug = $base . '-' . $number++;
        return $slug;
    }
}
