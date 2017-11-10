// As the WebExtension API does not support pluralization, implement
// Mozilla's pluralization rules as specified in:
//   https://developer.mozilla.org/en-US/docs/Mozilla/Localization/Localization_and_Plurals

function i18n_plural(message, number) {
    let forms = browser.i18n.getMessage(message, number).split(";")

    // Force number to non-negative integer (note that it was
    // substituted before forcing above). Pluralization does not make
    // sense for non-integer or negative numbers, only for things you
    // can count. (And even if it did, the rules are specified for
    // non-negative integers only.)
    number = ~~number; // force to integer
    if (number < 0) number = -number; // force to non-negative

    // the rule is the first item, the rest are the forms:
    let rule = ~~forms[0];
    
    switch (rule) {
    case 0: // 1 form
	// Families: Asian (Chinese, Japanese, Korean), Persian,
	// Turkic/Altaic (Turkish), Thai, Lao
	return forms[1]; // everything
    case 1: // 2 forms
	// Families: Germanic (Danish, Dutch, English, Faroese,
	// Frisian, German, Norwegian, Swedish), Finno-Ugric
	// (Estonian, Finnish, Hungarian), Language isolate (Basque),
	// Latin/Greek (Greek), Semitic (Hebrew), Romanic (Italian,
	// Portuguese, Spanish, Catalan), Vietnamese
	if (number == 1)
	    return forms[1]; // is 1
	return forms[2]; // everything else
    case 2: // 2 forms
	// Families: Romanic (French, Brazilian Portuguese)
	if (number < 2)
	    return forms[1]; // is 0 or 1
	return forms[2]; // everything else
    case 4: // 4 forms
	// Families: Celtic (Scottish Gaelic)
	if (number == 1 || number == 11)
	    return forms[1]; // is 1 or 11
	if (number == 2 || number == 12)
	    return forms[2]; // is 2 or 12
	if (number > 0 && number < 20)
	    return forms[3]; // is 3-10 or 13-19
	return forms[4]; // everything else
    case 5: // 3 forms
	// Families: Romanic (Romanian)
	if (number == 1)
	    return forms[1]; // is 1
	if (number == 0 || ((number % 100) > 0 && (number % 100) < 20))
	    return forms[2]; // is 0 or ends in 01-19, excluding 1
	return forms[3]; // everything else
    case 6: // 3 forms
	// Families: Baltic (Latvian, Lithuanian)
	if ((number % 10) == 1 && (number % 100) != 11)
	    return forms[1]; // ends in 1, excluding 11
	if ((number % 10) == 0 || ((number % 100) > 10 && (number % 100) < 20))
	    return forms[2]; // ends in 0 or ends in 11-19
	return forms[3]; // everything else
    case 7: // 3 forms
	// Families: Slavic (Belarusian, Bosnian, Croatian, Serbian,
	// Russian, Ukrainian)
	if ((number % 10) == 1 && (number % 100) != 11)
	    return forms[1]; // ends in 1, excluding 11
	if ((number % 10) > 1 && (number % 10) < 5
	    && ((number % 100) < 12 || (number % 100) > 14))
	    return forms[2]; // ends in 2-4, excluding 12-14
	return forms[3]; // everything else
    case 8: // 3 forms
	// Families: Slavic (Slovak, Czech)
	if (number == 1)
	    return forms[1]; // is 1
	if (number > 1 && number < 5)
	    return forms[2]; // is 2-4
	return forms[3]; // everything else
    case 9: // 3 forms
	// Families: Slavic (Polish)
	if (number == 1)
	    return forms[1]; // is 1
	if ((number % 10) > 1 && (number % 10) < 5
	    && ((number % 100) < 12 || (number % 100) > 14))
	    return forms[2]; // ends in 2-4, excluding 12-14
	return forms[3]; // everything else
    case 10: // 4 forms
	// Families: Slavic (Slovenian, Sorbian)
	if ((number % 100) == 1)
	    return forms[1]; // ends in 01
	if ((number % 100) == 2)
	    return forms[2]; // ends in 02
	if ((number % 100) == 3 || (number % 100) == 4)
	    return forms[3]; // ends in 03-04
	return forms[4]; // everything else
    case 11: // 5 forms
	// Families: Celtic (Irish Gaelic)
	if (number == 1)
	    return forms[1]; // is 1
	if (number == 2)
	    return forms[2]; // is 2
	if (number > 2 && number < 7)
	    return forms[3]; // is 3-6
	if (number > 6 && number < 11)
	    return forms[4]; // is 7-10
	return forms[5];
    case 12: // 6 forms
	// Families: Semitic (Arabic)
	if (number == 0)
	    return forms[6]; // is 0 (out of order)
	if (number == 1)
	    return forms[1]; // is 1
	if (number == 2)
	    return forms[2]; // is 2
	if ((number % 100) < 3)
	    return forms[5]; // ends in 00-02, excluding 0-2 (out of order)
	if ((number % 100) > 2 && (number % 100) < 11)
	    return forms[3]; // ends in 03-10
	return forms[4]; // everything else but is 0 and ends in
			 // 00-02, excluding 0-2
    case 13: // 4 forms
	// Families: Semitic (Maltese)
	if (number == 1)
	    return forms[1]; // is 1
	if (number == 0 || ((number % 100) > 0 && (number % 100) < 11))
	    return forms[2]; // is 0 or ends in 01-10, excluding 1
	if ((number % 100) > 10 && (number % 100) < 20)
	    return forms[3]; // ends in 11-19
	return forms[4]; // everything else
    case 14: // 3 forms
	// Families: Slavic (Macedonian)
	if ((number % 10) == 1)
	    return forms[1]; // ends in 1
	if ((number % 10) == 2)
	    return forms[2]; // ends in 2
	return forms[3]; // everything else
    case 15: // 2 forms
	// Families: Icelandic
	if ((number % 10) == 1 && (number % 100) != 11)
	    return forms[1]; // ends in 1, excluding 11
	return forms[2]; // everything else
    case 16: // 6 forms
	// Families: Celtic (Breton)
	if (number == 1)
	    return forms[1]; // is 1
	if ((number % 10) == 1
	    && (number % 100) != 11
	    && (number % 100) != 71
	    && (number % 100) != 91)
	    return forms[2]; // ends in 1, excluding 1, 11, 71, 91
	if ((number % 10) == 2
	    && (number % 100) != 12
	    && (number % 100) != 72
	    && (number % 100) != 92)
	    return forms[3]; // ends in 2, excluding 12, 72, 92
	if (((number % 10) == 3 || (number % 10) == 4 || (number % 10) == 9)
	    && (number % 100) != 13 && (number % 100) != 14
	    && (number % 100) != 19
	    && (number % 100) != 73 && (number % 100) != 74
	    && (number % 100) != 79
	    && (number % 100) != 93 && (number % 100) != 94
	    && (number % 100) != 99)
	    return forms[4]; // ends in 3, 4 or 9 excluding 13, 14,
			     // 19, 73, 74, 79, 93, 94, 99
	if (number > 0 && (number % 1000000) == 0)
	    return forms[5]; // ends in 1000000
	return forms[6]; // everything else
    }

    return forms[1]; // fallback to rule #0
}
