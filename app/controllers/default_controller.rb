# This controller has been generated so we can give you a 'pretty' and dynamic welcome page.
# You are under no obligation to extend from this controller, as some other frameworks would
# you too. :) If you do decide to extend this controller, you'll be happy to know that it
# will get loaded first, before your other controllers, so it will be present for their use.
class DefaultController 
  include Mack::Controller
 
	before_filter :update_sass_stylesheets



	def update_sass_stylesheets
		Sass::Plugin.options.merge!(:template_location  => Mack::Paths.public('stylesheets/sass'),
													:css_location       => Mack::Paths.public('stylesheets'),
													:always_check       => Mack.env != "production",
														:full_exception     => Mack.env != "production")
		
		if !Sass::Plugin.checked_for_updates ||
				Sass::Plugin.options[:always_update] || Sass::Plugin.options[:always_check]
			Sass::Plugin.update_stylesheets
		end
		return true
	end

end
