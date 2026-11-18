<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            [
                'name' => 'Administrator',
                'slug' => 'administrator',
                'permissions' => ['*'],
            ],
            [
                'name' => 'Editor',
                'slug' => 'editor',
                'permissions' => [
                    'posts.view',
                    'posts.create',
                    'posts.update',
                    'posts.delete',
                    'posts.publish',
                    'categories.view',
                    'categories.create',
                    'categories.update',
                    'categories.delete',
                    'media.view',
                    'media.create',
                    'media.update',
                    'media.delete',
                    'pages.view',
                    'pages.create',
                    'pages.update',
                    'pages.delete',
                    'pages.publish',
                    'tags.view',
                    'tags.create',
                    'tags.update',
                    'tags.delete',
                ],
            ],
            [
                'name' => 'Author',
                'slug' => 'author',
                'permissions' => [
                    'posts.view.own',
                    'posts.create',
                    'posts.update.own',
                    'media.view.own',
                    'media.create',
                    'categories.view',
                    'tags.view',
                ],
            ],
            [
                'name' => 'Contributor',
                'slug' => 'contributor',
                'permissions' => [
                    'posts.view.own',
                    'posts.create',
                    'posts.update.own',
                    'media.view.own',
                    'categories.view',
                    'media.create',
                    'tags.view',
                ],
            ],
        ];
        
        foreach ($roles as $role) {
            \App\Models\Role::updateOrCreate(
                ['slug' => $role['slug']],
                $role
            );
        }
    }
}
