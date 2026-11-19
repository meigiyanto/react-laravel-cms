<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('content_revisions', function (Blueprint $table) {
            $table->id();
            $table->morphs('revisionable');
            $table->unsignedInteger('revision_number');
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->json('snapshot');
            $table->string('change_summary', 500)->nullable();
            $table->timestamps();
            $table->unique(['revisionable_type', 'revisionable_id', 'revision_number'], 'content_revision_number_unique');
            $table->index(['revisionable_type', 'revisionable_id', 'created_at'], 'content_revision_history_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('content_revisions');
    }
};
