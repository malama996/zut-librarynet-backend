// ============================================================================
// Error Handling & Status Code Mapping Utility
// Maps backend errors to user-friendly messages based on HTTP status & content
// ============================================================================

export const ERROR_CODES = {
  // 4xx Client Errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  
  // 5xx Server Errors
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

/**
 * Maps API errors to user-friendly messages with context-aware help text
 * @param {AxiosError} error - The Axios error object
 * @returns {Object} {code, message, title, helpText, severity}
 */
export function getErrorInfo(error) {
  const status = error.response?.status;
  const data = error.response?.data;
  const message = data?.message || error.message || 'An unexpected error occurred';

  // Determine error type and provide context
  let errorInfo = {
    code: status || 'UNKNOWN',
    message,
    title: 'Error',
    helpText: '',
    severity: 'error', // 'info', 'warning', 'error', 'danger'
  };

  switch (status) {
    case 400: // Bad Request
      errorInfo.title = 'Invalid Request';
      if (message.includes('Digital resources')) {
        errorInfo.message = 'Digital resources are available online only. They cannot be physically borrowed.';
        errorInfo.helpText = 'Access digital resources through the URL provided in the resource details.';
        errorInfo.severity = 'info';
      } else if (message.includes('overdue')) {
        errorInfo.helpText = 'Return this item or extend the loan to continue borrowing.';
      } else if (message.includes('already')) {
        errorInfo.helpText = 'This item is not available right now.';
      }
      break;

    case 403: // Forbidden - Fines threshold exceeded
      errorInfo.title = 'Account Restricted';
      if (message.includes('fines') || message.includes('ZMW')) {
        errorInfo.message = 'You have outstanding fines that exceed the borrowing threshold.';
        errorInfo.helpText = 'Pay your fines to restore borrowing privileges.';
        errorInfo.severity = 'warning';
      } else if (message.includes('Researchers')) {
        errorInfo.message = 'Researchers can only borrow Journals.';
        errorInfo.helpText = 'Please select a Journal resource.';
      }
      break;

    case 401: // Unauthorized
      errorInfo.title = 'Authentication Required';
      errorInfo.message = 'Your session has expired or authentication is invalid.';
      errorInfo.helpText = 'Please log in again.';
      break;

    case 404: // Not Found
      errorInfo.title = 'Item Not Found';
      errorInfo.message = 'The resource or member you are looking for does not exist.';
      errorInfo.helpText = 'Please verify the ID and try again.';
      break;

    case 500: // Server Error
      errorInfo.title = 'Server Error';
      errorInfo.message = 'An error occurred on the server side.';
      errorInfo.helpText = 'Please try again later or contact support.';
      errorInfo.severity = 'danger';
      break;

    case 503: // Service Unavailable
      errorInfo.title = 'Service Unavailable';
      errorInfo.message = 'The service is temporarily unavailable.';
      errorInfo.helpText = 'Please try again in a few moments.';
      break;

    default:
      if (!status) {
        errorInfo.title = 'Network Error';
        errorInfo.message = 'Could not reach the server. Please check your connection.';
        errorInfo.helpText = 'Ensure you are connected to the internet and try again.';
      }
  }

  return errorInfo;
}

/**
 * Validates member can perform an action based on their restrictions
 * @param {Object} member - Member details from API
 * @returns {Object} {canBorrow, warnings}
 */
export function validateMemberStatus(member) {
  const warnings = [];
  let canBorrow = member?.canBorrow !== false;

  // Check fine threshold
  if (member?.totalFines > 50) {
    warnings.push({
      type: 'FINES_EXCEEDED',
      message: `Fines of ZMW ${member.totalFines.toFixed(2)} exceed the ZMW 50 limit.`,
      severity: 'danger',
    });
    canBorrow = false;
  }

  // Check borrow limit
  const activeLoans = member?.activeLoans || 0;
  const maxLimit = member?.maxBorrowLimit || 0;
  if (activeLoans >= maxLimit) {
    warnings.push({
      type: 'LIMIT_REACHED',
      message: `You have reached your borrow limit of ${maxLimit} items.`,
      severity: 'warning',
    });
    canBorrow = false;
  }

  // Type-specific warnings
  if (member?.memberType === 'STUDENT' && activeLoans >= 2) {
    warnings.push({
      type: 'APPROACHING_LIMIT',
      message: `You have ${maxLimit - activeLoans} slot(s) remaining.`,
      severity: 'info',
    });
  }

  return { canBorrow, warnings };
}

/**
 * Formats member-specific information without hardcoded type checks
 * @param {Object} member - Full member object from API
 * @returns {Object} Formatted display info
 */
export function formatMemberDisplay(member) {
  const memberTypeEmojis = {
    STUDENT: '🎓',
    LECTURER: '👨‍🎓',
    RESEARCHER: '🔬',
  };

  const typeLabel = member?.memberType || 'Member';
  const emoji = memberTypeEmojis[member?.memberType] || '👤';

  // Build type-specific display info by extracting from getTypeSpecificFields response
  const typeFields = member || {};
  let typeSpecificInfo = {};

  if (member?.studentId) {
    typeSpecificInfo = {
      id: member.studentId,
      category: member.programme,
      detail: `Year ${member.yearOfStudy}`,
    };
  } else if (member?.employeeId) {
    typeSpecificInfo = {
      id: member.employeeId,
      category: member.department,
      detail: `${member.yearsOfService} years service`,
    };
  } else if (member?.researcherId) {
    typeSpecificInfo = {
      id: member.researcherId,
      category: member.institution,
      detail: member.researchArea,
    };
  }

  return {
    emoji,
    typeLabel,
    typeSpecificInfo,
    displayName: `${emoji} ${member?.name} (${typeLabel})`,
  };
}

/**
 * Gets borrowing restrictions based on member type  *Pure function - no hardcoding
 * @param {string} memberType - STUDENT, LECTURER, RESEARCHER
 * @returns {Object} Restriction rules
 */
export function getMemberRestrictions(memberType) {
  const restrictions = {
    STUDENT: {
      maxBorrow: 3,
      loanDays: 14,
      finePerDay: 2,
      borrowTypes: ['BOOK', 'JOURNAL'],
      description: 'Students can borrow up to 3 items for 14 days at ZMW 2/day fine.',
    },
    LECTURER: {
      maxBorrow: 10,
      loanDays: 30,
      finePerDay: 5,
      borrowTypes: ['BOOK', 'JOURNAL'],
      description: 'Lecturers can borrow up to 10 items for 30 days at ZMW 5/day fine.',
    },
    RESEARCHER: {
      maxBorrow: 20,
      loanDays: 60,
      finePerDay: 0,
      borrowTypes: ['JOURNAL'], // Researchers: Journals only
      description: 'Researchers can borrow up to 20 Journals for 60 days (no fines).',
    },
  };

  return restrictions[memberType] || restrictions.STUDENT;
}

export default {
  ERROR_CODES,
  getErrorInfo,
  validateMemberStatus,
  formatMemberDisplay,
  getMemberRestrictions,
};
