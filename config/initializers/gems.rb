# Using this file you can add gems dependencies to your application.
# gem_name, options
# gem_name is the name of the gem you want to add.
# :version, optional, is the version of the gem you want to use.
# :libs, optional, is an array of files you want to require.
# :source, options, is the source you want to use to install a particular gem.
require_gems do |gem|
  gem.add "mack-data_mapper", :libs => "mack-data_mapper"
  gem.add "mack-haml", :libs => ["mack-haml", "sass", "sass/plugin"]  
  gem.add "dm-core"
  gem.add "ruby-debug"
  # examples:
  # gem.add :redgreen, :version => "1.2.2", :libs => :redgreen
  # gem.add :termios
  # gem.add :rubyzip, :source => "http://gems.rubyforge.org"
end

Mack::Rendering::Engine::Registry.instance.register(:partial, :haml)
Mack::Rendering::Engine::Registry.instance.register(:layout, :haml)

