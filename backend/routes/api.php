<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\PostController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\MediaController;
use App\Http\Controllers\Api\PageController;
use App\Models\Tag;


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

    Route::middleware('administrator')->group(function () {
        Route::get('/roles', [RoleController::class, 'index']);
    
        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::put('/users/{id}', [UserController::class, 'update']);
        Route::put('/users/{id}/role', [UserController::class, 'assignRole']);
    });

    Route::get('/dashboard/stats', [PostController::class, 'stats']);

    // ARTIKEL
    Route::middleware('permission:posts.view')->group(function () {
        Route::get('/posts', [PostController::class, 'index']);
        Route::get('/posts/{post}', [PostController::class, 'show']);
    });

    Route::post('/posts', [PostController::class, 'store'])
        ->middleware('permission:posts.create');

    Route::match(['put', 'patch'], '/posts/{post}', [
        PostController::class, 'update',
    ])->middleware('permission:posts.update');

    Route::delete('/posts/{post}', [
        PostController::class, 'destroy',
    ])->middleware('permission:posts.delete');

    // KATEGORI: hanya role yang memiliki permission terkait
    Route::get('/categories', [CategoryController::class, 'index'])
        ->middleware('permission:categories.view');
    Route::get('/categories/{category}', [CategoryController::class, 'show'])
        ->middleware('permission:categories.view');
    Route::post('/categories', [CategoryController::class, 'store'])
        ->middleware('permission:categories.create');
    Route::match(['put', 'patch'], '/categories/{category}', [
        CategoryController::class, 'update',
    ])->middleware('permission:categories.update');
    Route::delete('/categories/{category}', [
        CategoryController::class, 'destroy',
    ])->middleware('permission:categories.delete');

    // MEDIA
    Route::get('/media', [MediaController::class, 'index'])
        ->middleware('permission:media.view');
    Route::get('/media/{media}', [MediaController::class, 'show'])
        ->middleware('permission:media.view');
    Route::post('/media', [MediaController::class, 'store'])
        ->middleware('permission:media.create');
    Route::match(['put', 'patch'], '/media/{media}', [
        MediaController::class, 'update',
    ])->middleware('permission:media.update');
    Route::delete('/media/{media}', [
        MediaController::class, 'destroy',
    ])->middleware('permission:media.delete');

    // HALAMAN
    Route::get('/pages', [PageController::class, 'index'])
        ->middleware('permission:pages.view');
    Route::get('/pages/{page}', [PageController::class, 'show'])
        ->middleware('permission:pages.view');
    Route::post('/pages', [PageController::class, 'store'])
        ->middleware('permission:pages.create');
    Route::match(['put', 'patch'], '/pages/{page}', [
        PageController::class, 'update',
    ])->middleware('permission:pages.update');
    Route::delete('/pages/{page}', [
        PageController::class, 'destroy',
    ])->middleware('permission:pages.delete');

    // TAG
    Route::get('/tags', function () {
        return response()->json([
            'success' => true,
            'data' => Tag::query()
                ->orderBy('name')
                ->get(['id', 'name', 'slug']),
        ]);
    })->middleware('permission:tags.view');

    // Manajemen pengguna: pertahankan grup administrator yang sudah ada.
    Route::middleware('administrator')->group(function () {
        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::put('/users/{id}', [UserController::class, 'update']);
        Route::put('/users/{id}/role', [
            UserController::class, 'assignRole',
        ]);
    });
});

