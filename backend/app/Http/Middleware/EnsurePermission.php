<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePermission
{
    public function handle(
        Request $request,
        Closure $next,
        string $permission
    ): Response {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $permissions = $user?->role?->permissions ?? [];

        $allowed = is_array($permissions) && (
            in_array('*', $permissions, true)
            || in_array($permission, $permissions, true)
            || in_array($permission . '.own', $permissions, true)
        );

        if (! $allowed) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak memiliki izin untuk melakukan tindakan ini.',
            ], 403);
        }

        return $next($request);
    }
}
