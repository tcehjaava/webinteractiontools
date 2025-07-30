export interface ProviderConfig {
    name: string;
    maxImageDimension: number;
}

export const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
    claude: {
        name: 'Claude',
        maxImageDimension: 8000,
    },
    anthropic: {
        name: 'Anthropic',
        maxImageDimension: 8000,
    },
    gemini: {
        name: 'Gemini',
        maxImageDimension: 3072,
    },
    google: {
        name: 'Google',
        maxImageDimension: 3072,
    },
    openai: {
        name: 'OpenAI',
        maxImageDimension: 2048,
    },
    gpt4: {
        name: 'GPT-4',
        maxImageDimension: 2048,
    },
    default: {
        name: 'Default',
        maxImageDimension: 2000,
    },
};

export function getProviderConfig(provider?: string): ProviderConfig {
    if (!provider) {
        return PROVIDER_CONFIGS.default;
    }

    const normalizedProvider = provider.toLowerCase().trim();

    // Direct lookup first
    if (PROVIDER_CONFIGS[normalizedProvider]) {
        return PROVIDER_CONFIGS[normalizedProvider];
    }

    // Fuzzy matching for common variations
    if (
        normalizedProvider.includes('claude') ||
        normalizedProvider.includes('anthropic')
    ) {
        return PROVIDER_CONFIGS.claude;
    }

    if (
        normalizedProvider.includes('gemini') ||
        normalizedProvider.includes('google')
    ) {
        return PROVIDER_CONFIGS.gemini;
    }

    if (
        normalizedProvider.includes('openai') ||
        normalizedProvider.includes('gpt')
    ) {
        return PROVIDER_CONFIGS.openai;
    }

    return PROVIDER_CONFIGS.default;
}
