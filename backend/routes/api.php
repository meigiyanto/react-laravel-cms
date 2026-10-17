<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\PostController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\MediaController;
use App\Http\Controllers\Api\PageController;

Route::get('/health', function () {
    return response()->json([
        'success' => true,
        'message' => 'CMS API is running.',
        'app' => config('app.name'),
    ]);
});

Route::post('/auth/login', [AuthController::class, 'login'])
    ->middleware('throttle:10,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    Route::get('/dashboard/stats', [PostController::class, 'stats']);

    Route::apiResource('posts', PostController::class);
    Route::apiResource('categories', CategoryController::class);
    Route::apiResource('media', MediaController::class)->parameters(['media' => 'media']);
    Route::apiResource('pages', PageController::class);
});
