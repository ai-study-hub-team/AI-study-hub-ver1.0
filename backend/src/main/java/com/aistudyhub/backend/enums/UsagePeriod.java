package com.aistudyhub.backend.enums;

/**
 * Time windows supported by the Usage Analytics API.
 *
 * <pre>
 * DAY   → today 00:00 .. tomorrow 00:00
 * WEEK  → Monday 00:00 of current week .. next Monday 00:00
 * MONTH → first day of current month .. first day of next month
 * YEAR  → January 1 current year .. January 1 next year
 * </pre>
 *
 * All boundaries use the JVM default timezone (configured via OS / application.properties).
 */
public enum UsagePeriod {
    DAY,
    WEEK,
    MONTH,
    YEAR
}
