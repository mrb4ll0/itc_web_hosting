export class LoadingUtils {
  // Create dot loading animation
  static createDotLoadingAnimation(size = 'medium', text = 'Loading...') {
    const sizes = {
      small: { svgSize: '60x30', circleSize: 6, textSize: 'text-xs' },
      medium: { svgSize: '80x40', circleSize: 8, textSize: 'text-sm' },
      large: { svgSize: '100x50', circleSize: 10, textSize: 'text-base' }
    };
    
    const config = sizes[size] || sizes.medium;
    const [width, height] = config.svgSize.split('x').map(Number);

    return `
      <div class="loading-animation flex flex-col items-center justify-center">
        <svg width="${width}" height="${height}" viewBox="0 0 100 ${height}" class="mx-auto">
          <circle cx="20" cy="${height/2}" r="${config.circleSize}" fill="#3b82f6">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite" begin="0s"/>
          </circle>
          <circle cx="50" cy="${height/2}" r="${config.circleSize}" fill="#3b82f6">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite" begin="0.2s"/>
          </circle>
          <circle cx="80" cy="${height/2}" r="${config.circleSize}" fill="#3b82f6">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite" begin="0.4s"/>
          </circle>
        </svg>
        ${text ? `<p class="loading-text ${config.textSize} text-gray-500 dark:text-gray-400 mt-2 text-center">${text}</p>` : ''}
      </div>
    `;
  }

  // Create spinner loading animation
  static createSpinnerLoading(size = 'medium', text = 'Loading...') {
    const sizes = {
      small: { spinnerSize: 'w-4 h-4', textSize: 'text-xs' },
      medium: { spinnerSize: 'w-6 h-6', textSize: 'text-sm' },
      large: { spinnerSize: 'w-8 h-8', textSize: 'text-base' }
    };
    
    const config = sizes[size] || sizes.medium;

    return `
      <div class="spinner-loading flex flex-col items-center justify-center">
        <div class="${config.spinnerSize} border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        ${text ? `<p class="loading-text ${config.textSize} text-gray-500 dark:text-gray-400 mt-2">${text}</p>` : ''}
      </div>
    `;
  }

  // Create skeleton loading
  static createSkeletonLoading(type = 'card', count = 1) {
    const skeletons = {
      card: `
        <div class="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm animate-pulse">
          <div class="flex items-center space-x-4">
            <div class="w-12 h-12 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
            <div class="flex-1 space-y-2">
              <div class="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
              <div class="h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          </div>
          <div class="space-y-2 mt-4">
            <div class="h-3 bg-gray-300 dark:bg-gray-700 rounded"></div>
            <div class="h-3 bg-gray-300 dark:bg-gray-700 rounded w-5/6"></div>
          </div>
        </div>
      `,
      text: `
        <div class="animate-pulse">
          <div class="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
          <div class="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      `,
      stats: `
        <div class="animate-pulse">
          <div class="h-6 bg-gray-300 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
          <div class="h-8 bg-gray-300 dark:bg-gray-700 rounded w-1/4"></div>
        </div>
      `
    };

    const skeleton = skeletons[type] || skeletons.card;
    if (count === 1) return skeleton;

    return Array(count).fill(skeleton).join('');
  }

  // Show loading in element
  static showLoading(element, type = 'dots', options = {}) {
    if (!element) return;

    const { size, text, count } = options;

    let loadingHtml = '';
    switch (type) {
      case 'dots':
        loadingHtml = this.createDotLoadingAnimation(size, text);
        break;
      case 'spinner':
        loadingHtml = this.createSpinnerLoading(size, text);
        break;
      case 'skeleton':
        loadingHtml = this.createSkeletonLoading(options.skeletonType || 'card', count || 1);
        break;
      default:
        loadingHtml = this.createDotLoadingAnimation(size, text);
    }

    element.innerHTML = loadingHtml;
  }

  // Hide loading and restore content
  static hideLoading(element, originalContent = '') {
    if (!element) return;
    element.innerHTML = originalContent;
  }
}