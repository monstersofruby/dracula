# This controller has been generated so we can give you a 'pretty' and dynamic welcome page.
# You are under no obligation to extend from this controller, as some other frameworks would
# you too. :) If you do decide to extend this controller, you'll be happy to know that it
# will get loaded first, before your other controllers, so it will be present for their use.
class DefaultController
  include Mack::Controller
 
	before_filter :update_sass_stylesheets

  # '/'
  # Note: You do not need to actually have an empty action like this defined for Mack to
  # find the view on disk. This is only included here for the sake of 'completeness'.
  def index
    
  end


	def update_sass_stylesheets
		Sass::Plugin.options.merge!(:template_location  => Mack::Paths.public('stylesheets/sass'),
													:css_location       => Mack::Paths.public('stylesheets'),
													:always_check       => Mack.env != "production",
														:full_exception     => Mack.env != "production")
		
		if !Sass::Plugin.checked_for_updates ||
				Sass::Plugin.options[:always_update] || Sass::Plugin.options[:always_check]
		end
		Sass::Plugin.update_stylesheets
		return true
	end

end
