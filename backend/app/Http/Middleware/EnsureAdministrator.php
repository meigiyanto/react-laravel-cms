<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdministrator
{
    public function handle(
        Request $request,
        Closure $next
    ): Response {
        $user = $request->user();

        if (
            ! $user ||
            $user->role?->slug !== 'administrator'
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Akses hanya untuk administrator.',
            ], 403);
        }

        return $next($request);
    }
}
