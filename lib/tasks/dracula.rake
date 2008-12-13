namespace :dracula do
  namespace :db do
    desc 'Set up your database tables'
    task :auto_migrate do
      require 'dm-core'
      
      DataMapper.auto_migrate!
    end
    
  end
end