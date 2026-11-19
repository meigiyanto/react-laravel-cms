<?php

namespace App\Support;

class ThemeDefaults
{
    public static function settings(): array
    {
        return [
            'colors' => [
                'primary' => '#3458db',
                'secondary' => '#64748b',
                'background' => '#ffffff',
                'surface' => '#f8fafc',
                'text' => '#212529',
                'heading' => '#2d465e',
                'accent' => '#f75815',
                'contrast' => '#ffffff',
                'nav' => '#000000',
                'navHover' => '#f75815',
                'navBackground' => '#ffffff',
                'navDropdownBackground' => '#ffffff',
                'navDropdownText' => '#212529',
                'navDropdownHover' => '#f75815',
            ],
            'typography' => [
                'bodyFont' => 'Roboto, sans-serif',
                'headingFont' => 'Nunito, sans-serif',
                'navFont' => 'Poppins, sans-serif',
                'baseFontSize' => '16px',
                'headingWeight' => 700,
                'bodyWeight' => 400,
                'lineHeight' => 1.5,
            ],
            'layout' => [
                'containerWidth' => '1200px',
                'sectionSpacing' => '64px',
                'breakpoints' => ['sm' => 576, 'md' => 768, 'lg' => 992, 'xl' => 1200],
            ],
            'radius' => ['small' => '4px', 'medium' => '8px', 'large' => '16px'],
            'shadows' => ['small' => 'soft', 'medium' => 'medium', 'large' => 'strong'],
            'components' => ['buttonStyle' => 'solid', 'cardStyle' => 'elevated'],
        ];
    }
}
