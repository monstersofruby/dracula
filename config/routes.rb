Mack::Routes.build do |r|
  
  r.resource :links do |link|
    link.resource :comments
  end
  
  r.home_page "/", :controller => :default, :action => :index
  
  r.defaults
  
end
