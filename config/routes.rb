Mack::Routes.build do |r|
  
  r.home_page "/", :controller => :default, :action => :index
  
  r.defaults
  
end
