<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use RuntimeException;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $name = config('cms.bootstrap_admin.name');
        $email = config('cms.bootstrap_admin.email');
        $password = config('cms.bootstrap_admin.password');

        if (! filled($name) && ! filled($email) && ! filled($password)) {
            $this->command?->warn('Initial administrator skipped: CMS_ADMIN_* credentials are not configured.');

            return;
        }

        if (! filled($name) || ! filter_var($email, FILTER_VALIDATE_EMAIL) || ! filled($password)) {
            throw new RuntimeException('CMS_ADMIN_NAME, CMS_ADMIN_EMAIL, and CMS_ADMIN_PASSWORD must all be configured with a valid email address.');
        }

        if (mb_strlen($password) < 12) {
            throw new RuntimeException('CMS_ADMIN_PASSWORD must contain at least 12 characters.');
        }

        $administratorRole = Role::query()
            ->where('slug', 'administrator')
            ->firstOrFail();

        $user = User::query()->firstOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'password' => $password,
                'role_id' => $administratorRole->id,
            ]
        );

        if (! $user->wasRecentlyCreated) {
            $this->command?->warn('Initial administrator skipped: the configured email already belongs to an existing account. No account data was changed.');
        }
    }
}
