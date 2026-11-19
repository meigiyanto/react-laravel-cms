<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('layouts', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120);
            $table->string('slug', 140)->unique();
            $table->text('description')->nullable();
            $table->string('status', 20)->default('draft')->index();
            $table->unsignedSmallInteger('schema_version')->default(1);
            $table->json('definition');
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('layout_revisions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('layout_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('revision_number');
            $table->json('definition');
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();
            $table->unique(['layout_id', 'revision_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('layout_revisions');
        Schema::dropIfExists('layouts');
    }
};
