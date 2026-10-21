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
        string $permission,
        string $scope = 'allow-own'
    ): Response {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $permissions = $user->role?->permissions ?? [];

        if (! is_array($permissions)) {
            abort(403, 'Anda tidak memiliki izin untuk mengakses resource ini.');
        }

        $allowed = in_array('*', $permissions, true)
            || in_array($permission, $permissions, true)
            || (
                $scope === 'allow-own'
                && in_array($permission . '.own', $permissions, true)
            );

        if (! $allowed) {
            abort(403, 'Anda tidak memiliki izin untuk mengakses resource ini.');
        }

        return $next($request);
    }
}