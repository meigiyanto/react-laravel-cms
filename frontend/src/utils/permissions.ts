export type PermissionProfile = {
    permissions?: string[];
};

export function can(
    profile: PermissionProfile | null | undefined,
    permission: string,
): boolean {
    const permissions = profile?.permissions ?? [];

    return (
        permissions.includes("*") ||
        permissions.includes(permission) ||
        permissions.includes(`${permission}.own`)
    );
}

// Untuk resource bersama seperti Pages.
// Izin .own tidak dianggap sebagai izin global.
export function canExact(
    profile: PermissionProfile | null | undefined,
    permission: string,
): boolean {
    const permissions = profile?.permissions ?? [];

    return (
        permissions.includes("*") ||
        permissions.includes(permission)
    );
}

export function canOwnResource(
    profile: PermissionProfile | null | undefined,
    globalPermission: string,
    ownPermission: string,
    ownerId: number | string | null | undefined,
    currentUserId: number | string | null | undefined,
): boolean {
    const permissions = profile?.permissions ?? [];

    if (permissions.includes("*") || permissions.includes(globalPermission)) {
        return true;
    }

    return (
        permissions.includes(ownPermission) &&
        ownerId != null &&
        currentUserId != null &&
        String(ownerId) === String(currentUserId)
    );
}