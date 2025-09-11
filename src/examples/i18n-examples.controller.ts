import { Controller, Get, Post, Query, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam, ApiBody, ApiResponse } from '@nestjs/swagger';
import { I18nExamplesService } from './i18n-examples.service';
import { Roles } from '../modules/auth/decorators/roles.decorator';

/**
 * I18n Examples Controller
 * 
 * Demonstrates comprehensive internationalization (i18n) features:
 * - Multi-language content delivery
 * - Dynamic language switching
 * - Pluralization support
 * - Error message localization
 * - Form validation messages
 * - Time and date formatting
 * - Authentication messages
 * 
 * Language Detection Methods:
 * 1. Query parameter: ?lang=es
 * 2. Custom header: x-lang: fr
 * 3. Accept-Language header: Accept-Language: de-DE,de;q=0.9
 * 4. Cookie: lang=es (if cookie resolver is enabled)
 */

@ApiTags('I18n Examples')
@Controller('i18n-examples')
export class I18nExamplesController {
  constructor(private readonly i18nExamplesService: I18nExamplesService) {}

  /**
   * 🌐 BASIC TRANSLATION EXAMPLE
   * 
   * Returns basic translated messages in the detected/specified language
   */
  @Get('basic')
  @Roles('user', 'admin', 'superadmin')
  @ApiOperation({
    summary: 'Basic translation example',
    description: `
    Demonstrates basic message translation using the current language context.
    
    **Language Detection:**
    - Query parameter: ?lang=es
    - Custom header: x-lang: fr
    - Accept-Language header
    
    **Available Languages:**
    - en (English) - Default fallback
    - es (Español)
    - fr (Français)  
    - de (Deutsch)
    
    **Example Usage:**
    - \`GET /i18n-examples/basic\` - Uses detected language
    - \`GET /i18n-examples/basic?lang=es\` - Forces Spanish
    - \`GET /i18n-examples/basic\` with header \`x-lang: fr\` - Forces French
    `,
  })
  @ApiQuery({
    name: 'lang',
    required: false,
    description: 'Language code (en, es, fr, de)',
    example: 'es',
  })
  @ApiResponse({
    status: 200,
    description: 'Basic translated messages',
    schema: {
      example: {
        success: true,
        data: {
          greeting: 'Hola',
          welcome: 'Bienvenido a FleetStack',
          goodbye: 'Adiós',
          currentLanguage: 'es',
        },
        timestamp: '2024-01-01T12:00:00.000Z',
      },
    },
  })
  async getBasicTranslation(@Query('lang') language?: string) {
    return this.i18nExamplesService.getBasicTranslation(language);
  }

  /**
   * 🏷️ DYNAMIC TRANSLATION WITH VARIABLES
   * 
   * Shows translation with dynamic content interpolation
   */
  @Get('dynamic/:name')
  @Roles('user', 'admin', 'superadmin')
  @ApiOperation({
    summary: 'Dynamic translation with variables',
    description: `
    Demonstrates translation with variable interpolation using {{name}} syntax.
    
    **Features:**
    - Variable substitution in translations
    - Personalized messages
    - Context-aware content
    
    **Translation Keys Used:**
    - common.hello_with_name: "Hello, {{name}}!" / "¡Hola, {{name}}!"
    - common.welcome_with_name: "Welcome back, {{name}}!" / "¡Bienvenido de vuelta, {{name}}!"
    `,
  })
  @ApiParam({
    name: 'name',
    description: 'User name for personalization',
    example: 'Maria',
  })
  @ApiQuery({
    name: 'lang',
    required: false,
    description: 'Language code (en, es, fr, de)',
    example: 'es',
  })
  @ApiResponse({
    status: 200,
    description: 'Dynamic translated messages with variables',
    schema: {
      example: {
        success: true,
        data: {
          personalGreeting: '¡Hola, Maria!',
          personalWelcome: '¡Bienvenido de vuelta, Maria!',
          currentLanguage: 'es',
          userName: 'Maria',
        },
        timestamp: '2024-01-01T12:00:00.000Z',
      },
    },
  })
  async getDynamicTranslation(
    @Param('name') name: string,
    @Query('lang') language?: string,
  ) {
    return this.i18nExamplesService.getDynamicTranslation(name, language);
  }

  /**
   * 🔢 PLURALIZATION SUPPORT
   * 
   * Demonstrates plural form handling for different languages
   */
  @Get('pluralization/:count')
  @Roles('user', 'admin', 'superadmin')
  @ApiOperation({
    summary: 'Pluralization support example',
    description: `
    Shows how plural forms are handled differently across languages.
    
    **Pluralization Rules:**
    - **English:** 0="No items", 1="One item", other="X items"
    - **Spanish:** 0="Sin elementos", 1="Un elemento", other="X elementos"
    - **French:** 0="Aucun élément", 1="Un élément", other="X éléments"
    - **German:** 0="Keine Elemente", 1="Ein Element", other="X Elemente"
    
    **Test Cases:**
    - 0: Special case for "no items"
    - 1: Singular form
    - 2+: Plural form
    `,
  })
  @ApiParam({
    name: 'count',
    description: 'Number of items for pluralization',
    example: 5,
  })
  @ApiQuery({
    name: 'lang',
    required: false,
    description: 'Language code (en, es, fr, de)',
    example: 'es',
  })
  @ApiResponse({
    status: 200,
    description: 'Pluralized content based on count and language',
    schema: {
      example: {
        success: true,
        data: {
          itemsMessage: '5 elementos',
          count: 5,
          currentLanguage: 'es',
          examples: {
            0: 'Sin elementos',
            1: 'Un elemento',
            5: '5 elementos',
            25: '25 elementos',
          },
        },
        timestamp: '2024-01-01T12:00:00.000Z',
      },
    },
  })
  async getPluralizedContent(
    @Param('count') count: number,
    @Query('lang') language?: string,
  ) {
    return this.i18nExamplesService.getPluralizedContent(Number(count), language);
  }

  /**
   * 🌍 MULTI-LANGUAGE CONTENT
   * 
   * Returns the same content translated into all supported languages
   */
  @Get('multi-language')
  @Roles('user', 'admin', 'superadmin')
  @ApiOperation({
    summary: 'Multi-language content example',
    description: `
    Returns the same content translated into all supported languages simultaneously.
    
    **Use Cases:**
    - Language comparison
    - Translation quality assurance
    - Multi-language UI development
    - Content management systems
    
    **Supported Languages:**
    - en: English
    - es: Español
    - fr: Français
    - de: Deutsch
    `,
  })
  @ApiQuery({
    name: 'message',
    required: false,
    description: 'Custom message for context',
    example: 'Test message',
  })
  @ApiResponse({
    status: 200,
    description: 'Content in all supported languages',
    schema: {
      example: {
        success: true,
        message: 'Content available in multiple languages',
        supportedLanguages: ['en', 'es', 'fr', 'de'],
        translations: {
          en: {
            greeting: 'Hello',
            welcome: 'Welcome to FleetStack',
            success: 'Success',
            buttons: {
              save: 'Save',
              cancel: 'Cancel',
              delete: 'Delete',
              edit: 'Edit',
            },
          },
          es: {
            greeting: 'Hola',
            welcome: 'Bienvenido a FleetStack',
            success: 'Éxito',
            buttons: {
              save: 'Guardar',
              cancel: 'Cancelar',
              delete: 'Eliminar',
              edit: 'Editar',
            },
          },
        },
        timestamp: '2024-01-01T12:00:00.000Z',
      },
    },
  })
  async getMultiLanguageContent(@Query('message') message: string = '') {
    return this.i18nExamplesService.getMultiLanguageContent(message);
  }

  /**
   * 🔐 AUTHENTICATION MESSAGES
   * 
   * Shows authentication-related message translations
   */
  @Get('auth-messages')
  @Roles('user', 'admin', 'superadmin')
  @ApiOperation({
    summary: 'Authentication messages translation',
    description: `
    Demonstrates authentication-related message translations.
    
    **Message Categories:**
    - Login/logout actions
    - Success/error messages
    - Account status messages
    - Session management
    
    **Translation Keys:**
    - auth.login, auth.logout, auth.signup
    - auth.login_success, auth.logout_success
    - auth.invalid_credentials, auth.user_not_found
    - auth.session_expired
    `,
  })
  @ApiQuery({
    name: 'lang',
    required: false,
    description: 'Language code (en, es, fr, de)',
    example: 'fr',
  })
  @ApiResponse({
    status: 200,
    description: 'Authentication messages in specified language',
    schema: {
      example: {
        success: true,
        data: {
          login: 'Connexion',
          logout: 'Déconnexion',
          signup: "S'inscrire",
          loginSuccess: 'Connexion réussie',
          logoutSuccess: 'Déconnexion réussie',
          invalidCredentials: 'Email ou mot de passe invalide',
          userNotFound: 'Utilisateur non trouvé',
          sessionExpired: 'Votre session a expiré, veuillez vous reconnecter',
          currentLanguage: 'fr',
        },
        timestamp: '2024-01-01T12:00:00.000Z',
      },
    },
  })
  async getAuthMessages(@Query('lang') language?: string) {
    return this.i18nExamplesService.getAuthMessages(language);
  }

  /**
   * ❌ LOCALIZED ERROR DEMONSTRATION
   * 
   * Triggers different types of errors with localized messages
   */
  @Get('localized-errors')
  @Roles('user', 'admin', 'superadmin')
  @ApiOperation({
    summary: 'Localized error messages demonstration',
    description: `
    Demonstrates how error messages are localized based on the current language context.
    
    **Error Types:**
    - **business_logic**: Business rule violations
    - **resource_not_found**: Resource lookup failures
    - **validation_error**: Input validation failures
    - **service_unavailable**: External service downtime
    
    **Features:**
    - Error messages translated to current language
    - Context-aware error details
    - Fallback to English if translation fails
    - Consistent error response format
    
    **Translation Keys:**
    - errors.business_logic.user_action_forbidden
    - errors.resource.not_found
    - errors.validation.email_format
    - errors.service.unavailable
    `,
  })
  @ApiQuery({
    name: 'type',
    required: true,
    description: 'Type of error to demonstrate',
    enum: ['business_logic', 'resource_not_found', 'validation_error', 'service_unavailable'],
    example: 'business_logic',
  })
  @ApiQuery({
    name: 'lang',
    required: false,
    description: 'Language code (en, es, fr, de)',
    example: 'es',
  })
  @ApiResponse({
    status: 422,
    description: 'Business Logic Error (Localized)',
    schema: {
      example: {
        success: false,
        error: 'Error de Lógica de Negocio',
        message: 'No puedes realizar esta acción debido a las reglas de negocio',
        statusCode: 422,
        path: '/i18n-examples/localized-errors',
        method: 'GET',
        timestamp: '2024-01-01T12:00:00.000Z',
        requestId: 'req_abc123',
        details: {
          errorCode: 'USER_ACTION_FORBIDDEN',
          context: { userId: 123, action: 'delete_account' },
          i18nKey: 'errors.business_logic.user_action_forbidden',
        },
      },
    },
  })
  async demonstrateLocalizedErrors(
    @Query('type') errorType: string,
    @Query('lang') language?: string,
  ) {
    return this.i18nExamplesService.demonstrateLocalizedErrors(errorType, language);
  }

  /**
   * ⏰ TIME AND DATE LOCALIZATION
   * 
   * Shows time-related message formatting in different languages
   */
  @Get('time-messages/:minutes')
  @Roles('user', 'admin', 'superadmin')
  @ApiOperation({
    summary: 'Time and date localization',
    description: `
    Demonstrates time-related message formatting across different languages.
    
    **Time Formats:**
    - Just now
    - X minutes ago
    - X hours ago
    - X days ago
    
    **Language Variations:**
    - **English:** "5 minutes ago", "1 hour ago"
    - **Spanish:** "hace 5 minutos", "hace 1 hora"
    - **French:** "il y a 5 minutes", "il y a 1 heure"
    - **German:** "vor 5 Minuten", "vor 1 Stunde"
    `,
  })
  @ApiParam({
    name: 'minutes',
    description: 'Minutes ago for time calculation',
    example: 45,
  })
  @ApiQuery({
    name: 'lang',
    required: false,
    description: 'Language code (en, es, fr, de)',
    example: 'de',
  })
  @ApiResponse({
    status: 200,
    description: 'Time messages in specified language',
    schema: {
      example: {
        success: true,
        data: {
          justNow: 'Gerade eben',
          minutesAgo: 'vor 45 Minuten',
          hoursAgo: 'vor 0 Stunden',
          daysAgo: 'vor 0 Tagen',
          examples: {
            0: 'Gerade eben',
            5: 'vor 5 Minuten',
            65: 'vor 1 Stunden',
            1500: 'vor 1 Tagen',
          },
          currentLanguage: 'de',
        },
        timestamp: '2024-01-01T12:00:00.000Z',
      },
    },
  })
  async getLocalizedTimeMessages(
    @Param('minutes') minutesAgo: number,
    @Query('lang') language?: string,
  ) {
    return this.i18nExamplesService.getLocalizedTimeMessages(Number(minutesAgo), language);
  }

  /**
   * 📄 PAGINATION MESSAGES
   * 
   * Shows pagination-related translations with dynamic content
   */
  @Get('pagination')
  @Roles('user', 'admin', 'superadmin')
  @ApiOperation({
    summary: 'Pagination messages localization',
    description: `
    Demonstrates pagination message translations with dynamic content.
    
    **Pagination Elements:**
    - "Showing X to Y of Z entries" message
    - Navigation button labels
    - Dynamic number formatting
    
    **Example Translations:**
    - **English:** "Showing 1 to 10 of 100 entries"
    - **Spanish:** "Mostrando 1 a 10 de 100 entradas"
    - **French:** "Affichage de 1 à 10 sur 100 entrées"
    - **German:** "Zeige 1 bis 10 von 100 Einträgen"
    `,
  })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'Starting item number',
    example: 1,
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'Ending item number',
    example: 10,
  })
  @ApiQuery({
    name: 'total',
    required: false,
    description: 'Total number of items',
    example: 100,
  })
  @ApiQuery({
    name: 'lang',
    required: false,
    description: 'Language code (en, es, fr, de)',
    example: 'fr',
  })
  @ApiResponse({
    status: 200,
    description: 'Pagination messages in specified language',
    schema: {
      example: {
        success: true,
        data: {
          showing: 'Affichage de 1 à 10 sur 100 entrées',
          navigation: {
            previous: 'Précédent',
            next: 'Suivant',
            first: 'Premier',
            last: 'Dernier',
          },
          pagination: {
            from: 1,
            to: 10,
            total: 100,
            hasNext: true,
            hasPrevious: false,
          },
          currentLanguage: 'fr',
        },
        timestamp: '2024-01-01T12:00:00.000Z',
      },
    },
  })
  async getPaginationMessages(
    @Query('from') from: number = 1,
    @Query('to') to: number = 10,
    @Query('total') total: number = 100,
    @Query('lang') language?: string,
  ) {
    return this.i18nExamplesService.getPaginationMessages(
      Number(from), 
      Number(to), 
      Number(total), 
      language
    );
  }

  /**
   * ✅ FORM VALIDATION MESSAGES
   * 
   * Shows form validation message translations
   */
  @Get('validation-messages')
  @Roles('user', 'admin', 'superadmin')
  @ApiOperation({
    summary: 'Form validation messages',
    description: `
    Demonstrates form validation message translations.
    
    **Validation Types:**
    - Required field validation
    - Email format validation
    - Length validations (min/max)
    - Numeric validations
    - Date/URL/Phone format validations
    
    **Dynamic Content:**
    - {{min}}/{{max}} for length constraints
    - Context-aware error messages
    - Field-specific validations
    `,
  })
  @ApiQuery({
    name: 'lang',
    required: false,
    description: 'Language code (en, es, fr, de)',
    example: 'es',
  })
  @ApiResponse({
    status: 200,
    description: 'Validation messages in specified language',
    schema: {
      example: {
        success: true,
        data: {
          required: 'Este campo es requerido',
          emailFormat: 'Por favor ingresa una dirección de email válida',
          minLength: 'Debe tener al menos 8 caracteres de longitud',
          maxLength: 'Debe tener no más de 50 caracteres de longitud',
          numeric: 'Debe ser un número válido',
          between: 'Debe estar entre 1 y 100',
          dateFormat: 'Por favor ingresa una fecha válida',
          urlFormat: 'Por favor ingresa una URL válida',
          phoneFormat: 'Por favor ingresa un número de teléfono válido',
          currentLanguage: 'es',
        },
        timestamp: '2024-01-01T12:00:00.000Z',
      },
    },
  })
  async getValidationMessages(@Query('lang') language?: string) {
    return this.i18nExamplesService.getValidationMessages(language);
  }

  /**
   * 🔍 LANGUAGE DETECTION INFO
   * 
   * Shows current language detection information
   */
  @Get('language-info')
  @Roles('user', 'admin', 'superadmin')
  @ApiOperation({
    summary: 'Language detection information',
    description: `
    Provides information about current language detection and available options.
    
    **Detection Methods:**
    1. **Query Parameter:** ?lang=es, ?locale=fr, ?l=de
    2. **Custom Headers:** x-lang: es, x-custom-lang: fr
    3. **Accept-Language:** Standard HTTP header
    4. **Cookies:** lang=es (if cookie resolver enabled)
    
    **Available Languages:**
    - en: English (default/fallback)
    - es: Español
    - fr: Français
    - de: Deutsch
    
    **Test Examples:**
    - \`curl "url?lang=es"\`
    - \`curl -H "x-lang: fr" "url"\`
    - \`curl -H "Accept-Language: de-DE,de;q=0.9" "url"\`
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Language detection and configuration information',
    schema: {
      example: {
        success: true,
        data: {
          currentLanguage: 'en',
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
          greeting: 'Hello',
          languageNames: {
            en: 'English',
            es: 'Español',
            fr: 'Français',
            de: 'Deutsch',
          },
        },
        timestamp: '2024-01-01T12:00:00.000Z',
      },
    },
  })
  async getLanguageInfo() {
    return this.i18nExamplesService.getLanguageInfo();
  }
}