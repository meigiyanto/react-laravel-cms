<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('themes', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('version', 30)->default('1.0.0');
            $table->string('status', 20)->default('draft')->index();
            $table->timestamps();
        });

        Schema::create('theme_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('theme_id')->unique()->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('schema_version')->default(1);
            $table->json('settings');
            $table->timestamps();
        });

        Schema::create('theme_revisions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('theme_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('revision_number');
            $table->json('settings');
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();
            $table->unique(['theme_id', 'revision_number']);
        });

        Schema::create('theme_activations', function (Blueprint $table) {
            $table->unsignedTinyInteger('id')->primary();
            $table->foreignId('theme_id')->constrained()->restrictOnDelete();
            $table->foreignId('activated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('theme_activations');
        Schema::dropIfExists('theme_revisions');
        Schema::dropIfExists('theme_settings');
        Schema::dropIfExists('themes');
    }
};
