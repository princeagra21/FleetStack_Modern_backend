import { Injectable, Logger } from '@nestjs/common';
import { I18nService, I18nContext } from 'nestjs-i18n';
import {
  BusinessLogicException,
  ResourceNotFoundException,
  ValidationException,
  ServiceUnavailableException,
} from '../common/exceptions/custom-exceptions';

/**
 * I18n Examples Service
 * 
 * Demonstrates comprehensive internationalization features including:
 * - Multi-language content delivery
 * - Dynamic message translation with variables
 * - Pluralization support
 * - Error message localization
 * - Logging message translation
 * - Language detection and switching
 */

@Injectable()
export class I18nExamplesService {
  private readonly logger = new Logger(I18nExamplesService.name);

  constructor(private readonly i18n: I18nService) {}

  /**
   * Example 1: Basic Translation
   * 
   * Demonstrates simple message translation using I18nContext
   */
  async getBasicTranslation(language?: string) {
    const i18n = I18nContext.current();
    
    this.logger.log(`Getting basic translation for language: ${language || 'current context'}`);

    if (!i18n) {
      throw new Error('I18n context not available');
    }

    return {
      success: true,
      data: {
        greeting: await i18n.t('common.greeting'),
        welcome: await i18n.t('common.welcome'),
        goodbye: await i18n.t('common.goodbye'),
        currentLanguage: i18n.lang,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Example 2: Dynamic Translation with Variables
   * 
   * Shows how to use variables in translations
   */
  async getDynamicTranslation(name: string, language?: string) {
    const i18n = I18nContext.current();
    
    this.logger.log(`Getting dynamic translation for user: ${name}, language: ${language || 'current context'}`);

    if (!i18n) {
      throw new Error('I18n context not available');
    }

    return {
      success: true,
      data: {
        personalGreeting: await i18n.t('common.hello_with_name', { args: { name } }),
        personalWelcome: await i18n.t('common.welcome_with_name', { args: { name } }),
        currentLanguage: i18n.lang,
        userName: name,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Example 3: Pluralization Support
   * 
   * Demonstrates plural form handling for different languages
   */
  async getPluralizedContent(count: number, language?: string) {
    const i18n = I18nContext.current();
    
    this.logger.log(`Getting pluralized content for count: ${count}, language: ${language || 'current context'}`);

    if (!i18n) {
      throw new Error('I18n context not available');
    }

    return {
      success: true,
      data: {
        itemsMessage: await i18n.t('common.items_count', { args: { count } }),
        count,
        currentLanguage: i18n.lang,
        examples: {
          0: await i18n.t('common.items_count', { args: { count: 0 } }),
          1: await i18n.t('common.items_count', { args: { count: 1 } }),
          5: await i18n.t('common.items_count', { args: { count: 5 } }),
          25: await i18n.t('common.items_count', { args: { count: 25 } }),
        },
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Example 4: Multi-Language Content
   * 
   * Returns the same content in multiple languages
   */
  async getMultiLanguageContent(message: string) {
    this.logger.log(`Getting multi-language content for message: ${message}`);

    const languages = ['en', 'es', 'fr', 'de'];
    const translations = {};

    for (const lang of languages) {
      translations[lang] = {
        greeting: await this.i18n.translate('common.greeting', { lang }),
        welcome: await this.i18n.translate('common.welcome', { lang }),
        success: await this.i18n.translate('common.success', { lang }),
        error: await this.i18n.translate('common.error', { lang }),
        warning: await this.i18n.translate('common.warning', { lang }),
        info: await this.i18n.translate('common.info', { lang }),
        buttons: {
          save: await this.i18n.translate('common.save', { lang }),
          cancel: await this.i18n.translate('common.cancel', { lang }),
          delete: await this.i18n.translate('common.delete', { lang }),
          edit: await this.i18n.translate('common.edit', { lang }),
        },
      };
    }

    return {
      success: true,
      message: 'Content available in multiple languages',
      supportedLanguages: languages,
      translations,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Example 5: Authentication Messages
   * 
   * Demonstrates auth-related message translations
   */
  async getAuthMessages(language?: string) {
    const i18n = I18nContext.current();
    
    this.logger.log(`Getting auth messages for language: ${language || 'current context'}`);

    if (!i18n) {
      throw new Error('I18n context not available');
    }

    return {
      success: true,
      data: {
        login: await i18n.t('auth.login'),
        logout: await i18n.t('auth.logout'),
        signup: await i18n.t('auth.signup'),
        loginSuccess: await i18n.t('auth.login_success'),
        logoutSuccess: await i18n.t('auth.logout_success'),
        invalidCredentials: await i18n.t('auth.invalid_credentials'),
        userNotFound: await i18n.t('auth.user_not_found'),
        sessionExpired: await i18n.t('auth.session_expired'),
        currentLanguage: i18n.lang,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Example 6: Error Message Localization
   * 
   * Shows how error messages are translated based on context
   */
  async demonstrateLocalizedErrors(errorType: string, language?: string) {
    this.logger.log(`Demonstrating localized errors for type: ${errorType}, language: ${language || 'current context'}`);

    switch (errorType) {
      case 'business_logic':
        throw new BusinessLogicException(
          'Default message', // Fallback message
          'USER_ACTION_FORBIDDEN',
          { userId: 123, action: 'delete_account' },
          'errors.business_logic.user_action_forbidden' // i18n key
        );

      case 'resource_not_found':
        throw new ResourceNotFoundException(
          'User',
          999,
          { searchCriteria: 'email' },
          'errors.resource.not_found' // i18n key
        );

      case 'validation_error':
        throw new ValidationException(
          'email',
          'invalid-email',
          'valid email format',
          { providedValue: 'invalid-email' },
          'errors.validation.email_format' // i18n key
        );

      case 'service_unavailable':
        throw new ServiceUnavailableException(
          'Payment Gateway',
          'Connection timeout',
          30,
          { lastConnected: new Date(Date.now() - 30000).toISOString() },
          'errors.service.unavailable' // i18n key
        );

      default:
        throw new ValidationException(
          'errorType',
          errorType,
          'one of: business_logic, resource_not_found, validation_error, service_unavailable',
          { availableTypes: ['business_logic', 'resource_not_found', 'validation_error', 'service_unavailable'] }
        );
    }
  }

  /**
   * Example 7: Time and Date Localization
   * 
   * Demonstrates time-related message formatting
   */
  async getLocalizedTimeMessages(minutesAgo: number, language?: string) {
    const i18n = I18nContext.current();
    
    this.logger.log(`Getting localized time messages for ${minutesAgo} minutes ago, language: ${language || 'current context'}`);

    if (!i18n) {
      throw new Error('I18n context not available');
    }

    return {
      success: true,
      data: {
        justNow: await i18n.t('common.time.just_now'),
        minutesAgo: await i18n.t('common.time.minutes_ago', { args: { count: minutesAgo } }),
        hoursAgo: await i18n.t('common.time.hours_ago', { args: { count: Math.floor(minutesAgo / 60) } }),
        daysAgo: await i18n.t('common.time.days_ago', { args: { count: Math.floor(minutesAgo / (60 * 24)) } }),
        examples: {
          0: await i18n.t('common.time.just_now'),
          5: await i18n.t('common.time.minutes_ago', { args: { count: 5 } }),
          65: await i18n.t('common.time.hours_ago', { args: { count: 1 } }),
          1500: await i18n.t('common.time.days_ago', { args: { count: 1 } }),
        },
        currentLanguage: i18n.lang,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Example 8: Pagination Messages
   * 
   * Shows pagination-related translations with dynamic content
   */
  async getPaginationMessages(from: number, to: number, total: number, language?: string) {
    const i18n = I18nContext.current();
    
    this.logger.log(`Getting pagination messages (${from}-${to} of ${total}), language: ${language || 'current context'}`);

    if (!i18n) {
      throw new Error('I18n context not available');
    }

    return {
      success: true,
      data: {
        showing: await i18n.t('common.pagination.showing', { args: { from, to, total } }),
        navigation: {
          previous: await i18n.t('common.pagination.previous'),
          next: await i18n.t('common.pagination.next'),
          first: await i18n.t('common.pagination.first'),
          last: await i18n.t('common.pagination.last'),
        },
        pagination: {
          from,
          to,
          total,
          hasNext: to < total,
          hasPrevious: from > 1,
        },
        currentLanguage: i18n.lang,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Example 9: Form Validation Messages
   * 
   * Demonstrates validation message translations
   */
  async getValidationMessages(language?: string) {
    const i18n = I18nContext.current();
    
    this.logger.log(`Getting validation messages for language: ${language || 'current context'}`);

    if (!i18n) {
      throw new Error('I18n context not available');
    }

    return {
      success: true,
      data: {
        required: await i18n.t('errors.validation.required'),
        emailFormat: await i18n.t('errors.validation.email_format'),
        minLength: await i18n.t('errors.validation.min_length', { args: { min: 8 } }),
        maxLength: await i18n.t('errors.validation.max_length', { args: { max: 50 } }),
        numeric: await i18n.t('errors.validation.numeric'),
        between: await i18n.t('errors.validation.between', { args: { min: 1, max: 100 } }),
        dateFormat: await i18n.t('errors.validation.date_format'),
        urlFormat: await i18n.t('errors.validation.url_format'),
        phoneFormat: await i18n.t('errors.validation.phone_format'),
        currentLanguage: i18n.lang,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Example 10: Language Detection Info
   * 
   * Shows how language was detected and what options are available
   */
  async getLanguageInfo() {
    const i18n = I18nContext.current();
    
    this.logger.log(`Getting language detection info for current context`);

    if (!i18n) {
      throw new Error('I18n context not available');
    }

    return {
      success: true,
      data: {
        currentLanguage: i18n.lang,
        availableLanguages: ['en', 'es', 'fr', 'de'],
        fallbackLanguage: 'en',
        detectionMethods: [
          'Query parameter (?lang=es)',
          'Custom header (x-lang: es)',
          'Accept-Language header',
          'Cookie (lang=es)',
        ],
        examples: {
          queryParam: '?lang=es or ?locale=fr',
          header: 'x-lang: de',
          acceptLanguage: 'Accept-Language: es-ES,es;q=0.9',
          cookie: 'Cookie: lang=fr',
        },
        greeting: await i18n.t('common.greeting'),
        languageNames: {
          en: 'English',
          es: 'Español',
          fr: 'Français',
          de: 'Deutsch',
        },
      },
      timestamp: new Date().toISOString(),
    };
  }
}