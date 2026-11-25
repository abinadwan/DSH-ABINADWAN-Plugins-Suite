    // Native settings editor. Only the official settings Remote writes values. No agent capabilities.
    // Registered only by `profilePlugin`, i.e. only while the Host Personal Profile row is On.
    const PROFILE_PANEL_ID = TYPE + '/personal-profile-page'
    function ProfilePanelIcon({ size = 20 }) {
      return suiteGlyph('personal-profile', size)
    }
    // Preference catalog and renderer generated from plugins/personal-profile/preferences.js.
    // Neutral values generate no extra preference text.
