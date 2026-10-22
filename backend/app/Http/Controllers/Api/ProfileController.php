<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'photo' => [
                'sometimes',
                'nullable',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:2048',
            ],
            'current_password' => [
                'nullable',
                'required_with:new_password',
                'string',
            ],
            'new_password' => [
                'nullable',
                'required_with:current_password',
                'string',
                'min:8',
                'confirmed',
            ],
        ]);

        $user = $request->user();

        if (filled($validated['new_password'] ?? null)) {
            if (! Hash::check(
                $validated['current_password'],
                $user->password
            )) {
                throw ValidationException::withMessages([
                    'current_password' => [
                        'Kata sandi saat ini tidak sesuai.',
                    ],
                ]);
            }

            $user->password = $validated['new_password'];
        }

        $user->name = $validated['name'];

        if ($request->hasFile('photo')) {
            $newPath = $request->file('photo')
                ->store('profiles', 'public');

            if ($user->profile_photo_path) {
                Storage::disk('public')->delete(
                    $user->profile_photo_path
                );
            }

            $user->profile_photo_path = $newPath;
        }

        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Profil berhasil diperbarui.',
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'profile_photo_url' => $user->profile_photo_path
                    ? Storage::disk('public')->url(
                        $user->profile_photo_path
                    )
                    : null,
            ],
        ]);
    }
}
