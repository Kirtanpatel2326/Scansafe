import { supabase } from './supabase'

/**
 * Persists the user's preferred language to Supabase.
 * Uses a double-fallback system: attempts to write to the preferred_language column,
 * and falls back to writing to dietary_profile.preferred_language if the column does not exist yet.
 */
export async function saveUserLanguage(userId: string, lang: string) {
  try {
    // 1. Attempt to update preferred_language column
    const { error } = await supabase
      .from('profiles')
      .update({ preferred_language: lang })
      .eq('id', userId)

    if (error) {
      console.warn('Failed to write to preferred_language column, attempting JSONB fallback:', error.message)
      
      // 2. Fallback: Save inside dietary_profile JSONB
      const { data: profile } = await supabase
        .from('profiles')
        .select('dietary_profile')
        .eq('id', userId)
        .single()

      const currentDiet = profile?.dietary_profile || {}
      await supabase
        .from('profiles')
        .update({
          dietary_profile: {
            ...currentDiet,
            preferred_language: lang
          }
        })
        .eq('id', userId)
    }
  } catch (e) {
    console.error('Error saving user language:', e)
  }
}

/**
 * Retrieves the user's preferred language from Supabase.
 * Checks both the preferred_language column and the dietary_profile fallback key.
 */
export async function getUserLanguage(userId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('preferred_language, dietary_profile')
      .eq('id', userId)
      .single()

    if (!error && data) {
      if (data.preferred_language) {
        return data.preferred_language
      }
      if (data.dietary_profile && typeof data.dietary_profile === 'object') {
        const diet = data.dietary_profile as Record<string, any>
        if (diet.preferred_language) {
          return diet.preferred_language
        }
      }
    }
  } catch (e) {
    console.error('Error loading user language from Supabase:', e)
  }
  return 'en'
}
